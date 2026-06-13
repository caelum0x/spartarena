import {
  createPublicClient,
  http,
  formatEther,
  size as byteSize,
  type Hex,
  type PublicClient,
} from "viem";
import { withBackoff, isTransient } from "../util/retry.js";
import type { ToolCall } from "./mantle.js";

/**
 * A single bytecode-level heuristic the inspector can raise. The `code` is a
 * stable key the agent maps to a deterministic severity and the LLM uses to
 * attach narrative; `present` is the deterministic on-chain fact.
 */
export interface BytecodeHeuristic {
  code: string;
  title: string;
  present: boolean;
  /** Short factual note describing what was (or wasn't) observed in bytecode. */
  note: string;
}

/**
 * Deterministic, tool-derived facts about a target address. Everything here is
 * an on-chain observation (or a deterministic offline sample) — no LLM input.
 */
export interface ContractReport {
  address: `0x${string}`;
  /** True when the address has deployed bytecode (a contract, not an EOA). */
  isContract: boolean;
  /** Bytecode size in bytes (0 for an EOA / undeployed address). */
  bytecodeSize: number;
  /** Native MNT balance, in ether units. */
  balanceMnt: string;
  /** Data source, surfaced in the proof for transparency. */
  source: "rpc" | "offline";
  heuristics: BytecodeHeuristic[];
}

/** EVM opcodes scanned for as crude static heuristics over raw bytecode. */
const OPCODE_SELFDESTRUCT = "ff";
const OPCODE_DELEGATECALL = "f4";
const OPCODE_CALLCODE = "f2";
const OPCODE_CREATE2 = "f5";

export interface ContractInspectorConfig {
  rpcUrl?: string;
  /** Allow a deterministic offline path when no RPC AND this is true. */
  offline?: boolean;
}

/**
 * ContractInspector: a real EVM bytecode inspector built on viem. For a target
 * address it reads `getCode` (is it a deployed contract? how large is the
 * bytecode?), `getBalance` (native MNT held), and runs a few static heuristics
 * over the raw bytecode — presence of SELFDESTRUCT (0xff), DELEGATECALL (0xf4),
 * CALLCODE (0xf2), CREATE2 (0xf5), and the no-code (EOA) case. Every read is
 * recorded as a `ToolCall` so it can be hashed into the decision proof.
 *
 * A deterministic offline path is provided ONLY when no RPC is configured AND
 * `offline` is true (MANTLE_OFFLINE=true) — used for tests/demos.
 */
export class ContractInspector {
  private readonly client?: PublicClient;
  private readonly offline: boolean;
  readonly calls: ToolCall[] = [];

  constructor(config: ContractInspectorConfig = {}) {
    const rpcUrl = config.rpcUrl ?? process.env.NEXT_PUBLIC_MANTLE_RPC_URL;
    this.offline = config.offline ?? process.env.MANTLE_OFFLINE === "true";

    if (rpcUrl) {
      this.client = createPublicClient({ transport: http(rpcUrl) });
    }

    if (!this.client && !this.offline) {
      throw new Error(
        "ContractInspector requires NEXT_PUBLIC_MANTLE_RPC_URL for real reads. Set it, " +
          "or set MANTLE_OFFLINE=true for an offline deterministic run.",
      );
    }
  }

  async inspect(address: `0x${string}`): Promise<ContractReport> {
    if (!this.client) {
      return this.offlineReport(address);
    }

    const code = await withBackoff(() => this.client!.getCode({ address }), {
      shouldRetry: isTransient,
    });
    // viem returns `undefined` for an address with no code; normalise to "0x".
    const bytecode = code ?? "0x";
    const isContract = bytecode !== "0x" && bytecode.length > 2;
    const bytecodeSize = isContract ? byteSize(bytecode) : 0;
    this.calls.push({
      tool: "contract.getCode",
      input: { address },
      output: { isContract, bytecodeSize },
    });

    const wei = await withBackoff(() => this.client!.getBalance({ address }), {
      shouldRetry: isTransient,
    });
    const balanceMnt = formatEther(wei);
    this.calls.push({
      tool: "contract.getBalance",
      input: { address },
      output: wei.toString(),
    });

    const heuristics = analyzeBytecode(bytecode, isContract);
    const report: ContractReport = {
      address,
      isContract,
      bytecodeSize,
      balanceMnt,
      source: "rpc",
      heuristics,
    };
    this.calls.push({
      tool: "contract.inspect",
      input: { address },
      output: { isContract, bytecodeSize, balanceMnt, heuristics },
    });
    return report;
  }

  /** Deterministic offline report — only reachable when MANTLE_OFFLINE=true. */
  private offlineReport(address: `0x${string}`): ContractReport {
    // A plausible deployed contract whose bytecode contains a DELEGATECALL
    // (proxy-like) but no SELFDESTRUCT — exercises the heuristic narrative.
    const bytecode: Hex =
      "0x6080604052348015600f57600080fd5b50f4366000803760008036600073deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef5af43d6000803e80f3";
    const isContract = true;
    const heuristics = analyzeBytecode(bytecode, isContract);
    const report: ContractReport = {
      address,
      isContract,
      bytecodeSize: byteSize(bytecode),
      balanceMnt: "4.2000",
      source: "offline",
      heuristics,
    };
    this.calls.push({
      tool: "contract.inspect",
      input: { address, source: "offline" },
      output: report,
    });
    return report;
  }
}

/**
 * Static bytecode heuristics. Crude (no full disassembly / PUSH-data skipping)
 * but deterministic and useful as audit signals. Always returns the full,
 * ordered heuristic set so the agent's severity mapping is exhaustive.
 */
function analyzeBytecode(bytecode: string, isContract: boolean): BytecodeHeuristic[] {
  if (!isContract) {
    return [
      {
        code: "NO_CODE_EOA",
        title: "Target has no deployed bytecode (EOA)",
        present: true,
        note: "getCode returned empty. This is an externally-owned account or an undeployed address, not a smart contract.",
      },
    ];
  }

  const hex = bytecode.toLowerCase().replace(/^0x/, "");
  const hasOpcode = (op: string): boolean => containsOpcode(hex, op);

  return [
    {
      code: "NO_CODE_EOA",
      title: "Deployed contract bytecode present",
      present: false,
      note: "getCode returned non-empty bytecode; the target is a smart contract.",
    },
    {
      code: "SELFDESTRUCT",
      title: "SELFDESTRUCT opcode present",
      present: hasOpcode(OPCODE_SELFDESTRUCT),
      note: hasOpcode(OPCODE_SELFDESTRUCT)
        ? "Bytecode contains a SELFDESTRUCT (0xff) opcode — the contract may be destroyable, draining funds and bricking integrations."
        : "No SELFDESTRUCT (0xff) opcode observed in bytecode.",
    },
    {
      code: "DELEGATECALL",
      title: "DELEGATECALL opcode present",
      present: hasOpcode(OPCODE_DELEGATECALL),
      note: hasOpcode(OPCODE_DELEGATECALL)
        ? "Bytecode contains DELEGATECALL (0xf4) — likely a proxy or library pattern; behaviour depends on a mutable implementation and warrants review."
        : "No DELEGATECALL (0xf4) opcode observed in bytecode.",
    },
    {
      code: "CALLCODE",
      title: "CALLCODE opcode present",
      present: hasOpcode(OPCODE_CALLCODE),
      note: hasOpcode(OPCODE_CALLCODE)
        ? "Bytecode contains the deprecated CALLCODE (0xf2) opcode, which is unusual in modern contracts."
        : "No CALLCODE (0xf2) opcode observed in bytecode.",
    },
    {
      code: "CREATE2",
      title: "CREATE2 opcode present",
      present: hasOpcode(OPCODE_CREATE2),
      note: hasOpcode(OPCODE_CREATE2)
        ? "Bytecode contains CREATE2 (0xf5) — the contract can deploy deterministic child contracts."
        : "No CREATE2 (0xf5) opcode observed in bytecode.",
    },
  ];
}

/**
 * Scans the raw hex bytecode for a one-byte opcode on byte boundaries. This is a
 * heuristic, not a disassembler: it does not skip PUSH immediate data, so it can
 * over-report. That conservative bias is acceptable for an audit signal that a
 * human reviews; it never under-reports a present opcode.
 */
function containsOpcode(hex: string, opcode: string): boolean {
  for (let i = 0; i + 2 <= hex.length; i += 2) {
    if (hex.slice(i, i + 2) === opcode) {
      return true;
    }
  }
  return false;
}
