import {
  createWalletClient,
  createPublicClient,
  http,
  defineChain,
  type Hex,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { decisionLedgerAbi, taskEscrowAbi, reputationEngineAbi } from "./abis.js";
import type { DecisionHashes } from "../hash.js";

export interface ChainConfig {
  rpcUrl: string;
  chainId: number;
  privateKey: Hex;
  decisionLedger: Address;
  taskEscrow: Address;
  reputationEngine: Address;
}

export interface DecisionWrite {
  agentId: bigint;
  taskId: bigint;
  hashes: DecisionHashes;
  confidence: number;
  riskScore: number;
  actionType: string;
}

export interface VerifierScore {
  accuracy: number;
  safety: number;
  speed: number;
  userRating: number;
}

/**
 * Writes decision proof, result hash and reputation score to Mantle. Each method
 * returns the transaction hash so the demo/UI can link to the explorer.
 */
export class ChainWriter {
  private readonly account;
  private readonly chain;
  private readonly wallet;
  private readonly pub;

  constructor(private readonly cfg: ChainConfig) {
    this.account = privateKeyToAccount(cfg.privateKey);
    this.chain = defineChain({
      id: cfg.chainId,
      name: `mantle-${cfg.chainId}`,
      nativeCurrency: { name: "Mantle", symbol: "MNT", decimals: 18 },
      rpcUrls: { default: { http: [cfg.rpcUrl] } },
    });
    this.wallet = createWalletClient({ account: this.account, chain: this.chain, transport: http(cfg.rpcUrl) });
    this.pub = createPublicClient({ chain: this.chain, transport: http(cfg.rpcUrl) });
  }

  private async send(hash: Hex): Promise<Hex> {
    await this.pub.waitForTransactionReceipt({ hash });
    return hash;
  }

  async recordDecision(d: DecisionWrite): Promise<Hex> {
    const hash = await this.wallet.writeContract({
      address: this.cfg.decisionLedger,
      abi: decisionLedgerAbi,
      functionName: "recordDecision",
      args: [
        d.agentId,
        d.taskId,
        d.hashes.promptHash,
        d.hashes.outputHash,
        d.hashes.toolsHash,
        BigInt(d.confidence),
        BigInt(d.riskScore),
        d.actionType,
      ],
    });
    return this.send(hash);
  }

  async submitResult(taskId: bigint, agentId: bigint, resultHash: Hex): Promise<Hex> {
    const hash = await this.wallet.writeContract({
      address: this.cfg.taskEscrow,
      abi: taskEscrowAbi,
      functionName: "submitResult",
      args: [taskId, agentId, resultHash],
    });
    return this.send(hash);
  }

  async submitScore(agentId: bigint, taskId: bigint, s: VerifierScore): Promise<Hex> {
    const hash = await this.wallet.writeContract({
      address: this.cfg.reputationEngine,
      abi: reputationEngineAbi,
      functionName: "submitScore",
      args: [agentId, taskId, BigInt(s.accuracy), BigInt(s.safety), BigInt(s.speed), BigInt(s.userRating)],
    });
    return this.send(hash);
  }
}
