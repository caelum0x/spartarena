import { type LlmProvider, completeJsonOrFallback } from "../llm/provider.js";
import {
  ContractAuditOutputSchema,
  ContractAuditLlmDecisionSchema,
  type ContractAuditFinding,
  type ContractAuditOutput,
  type ContractAuditLlmDecision,
} from "../schemas.js";
import { CONTRACT_AUDITOR_SYSTEM_PROMPT } from "../prompts/contract-auditor.system.js";
import { ContractInspector, type BytecodeHeuristic, type ContractReport } from "../tools/contract.js";
import type { ToolCall } from "../tools/mantle.js";
import type { AgentRun, BaseAgent } from "./BaseAgent.js";

const SYSTEM_PROMPT = CONTRACT_AUDITOR_SYSTEM_PROMPT;

type Severity = ContractAuditFinding["severity"];

export interface ContractAuditInput {
  taskId: number;
  /** The contract address to audit (0x-prefixed). */
  target: `0x${string}`;
  /** Optional framing of what the audit should focus on; threaded into the prompt. */
  goal?: string;
}

/** A heuristic that fired, paired with the deterministic severity the agent assigns. */
interface ScoredFinding {
  heuristic: BytecodeHeuristic;
  severity: Severity;
}

/**
 * ContractAuditor: a lightweight static contract reviewer. It inspects the target
 * contract via the REAL ContractInspector tool (getCode / getBalance / static
 * opcode heuristics over the bytecode; deterministic offline path behind
 * MANTLE_OFFLINE=true), records every read as a ToolCall, and derives a
 * deterministic riskScore/confidence from which heuristics fired. The LLM is asked
 * only for the qualitative narrative (overall summary, per-finding title + detail,
 * human explanation) via `completeJsonOrFallback`; the agent attaches the
 * deterministic severity to each finding so scoring stays reproducible.
 */
export class ContractAuditAgent
  implements BaseAgent<ContractAuditInput, ContractAuditOutput>
{
  private readonly inspector: ContractInspector;
  readonly calls: ToolCall[] = [];

  constructor(
    private readonly llm: LlmProvider,
    inspector?: ContractInspector,
  ) {
    this.inspector = inspector ?? new ContractInspector();
  }

  async run(input: ContractAuditInput): Promise<AgentRun<ContractAuditOutput>> {
    // Reset per-run tool calls so a reused instance never folds a prior run's
    // calls into this run's toolsHash (which would corrupt the proof).
    this.calls.length = 0;
    const report = await this.inspector.inspect(input.target);
    // Surface the inspector's recorded reads through this agent's tool log so the
    // proof's toolsHash binds the real on-chain inspection.
    this.calls.push(...this.inspector.calls);

    // Only heuristics that actually fired become findings; severity is assigned
    // deterministically so the LLM cannot influence the risk math.
    const scored: ScoredFinding[] = report.heuristics
      .filter((h) => h.present)
      .map((h) => ({ heuristic: h, severity: severityFor(h.code) }));

    const riskScore = deriveRisk(report, scored);
    const confidence = deriveConfidence(report);

    const userPrompt = buildUserPrompt(input, report, scored, riskScore, confidence);

    const decision = await completeJsonOrFallback(
      this.llm,
      SYSTEM_PROMPT,
      userPrompt,
      ContractAuditLlmDecisionSchema,
      buildFallbackDecision(report, scored),
    );

    // The agent owns severity + the set of firing heuristics; the LLM owns the
    // narrative. Build each finding from the deterministic heuristic, overlaying
    // the LLM's title/detail when it addressed that heuristic's code.
    const findings: ContractAuditFinding[] = scored.map(({ heuristic, severity }) => {
      const authored = decision.findings.find((f) => f.code === heuristic.code);
      return {
        severity,
        title: authored?.title ?? heuristic.title,
        detail: authored?.detail ?? heuristic.note,
      };
    });

    const output: ContractAuditOutput = {
      agentName: "ContractAuditor",
      taskId: input.taskId,
      decisionType: "CONTRACT_AUDIT",
      target: report.address,
      summary: decision.summary,
      findings,
      confidence,
      riskScore,
      humanExplanation: decision.humanExplanation,
    };

    // Validate at the boundary — never emit an unverified shape.
    const parsed = ContractAuditOutputSchema.parse(output);

    return {
      prompt: { system: SYSTEM_PROMPT, user: userPrompt },
      toolCalls: this.calls,
      output: parsed,
    };
  }
}

/** Deterministic severity per heuristic code. Single source of truth for risk. */
function severityFor(code: string): Severity {
  switch (code) {
    case "SELFDESTRUCT":
      return "high";
    case "DELEGATECALL":
      return "medium";
    case "CALLCODE":
      return "medium";
    case "CREATE2":
      return "low";
    case "NO_CODE_EOA":
      return "info";
    default:
      return "info";
  }
}

/** Numeric weight per severity, used to roll findings up into a risk score. */
function severityWeight(severity: Severity): number {
  switch (severity) {
    case "critical":
      return 40;
    case "high":
      return 28;
    case "medium":
      return 16;
    case "low":
      return 8;
    case "info":
      return 2;
  }
}

/**
 * Deterministic risk: an EOA carries minimal contract risk; for a real contract,
 * sum the severity weights of fired heuristics (clamped 0-100). Pure given the
 * report, so reproducible by the verifier.
 */
function deriveRisk(report: ContractReport, scored: readonly ScoredFinding[]): number {
  if (!report.isContract) {
    return 5;
  }
  const raw = scored.reduce((sum, s) => sum + severityWeight(s.severity), 0);
  return clampScore(raw);
}

/**
 * Deterministic confidence: bytecode-level static analysis is inherently limited,
 * so confidence is moderate, rising with the amount of bytecode actually inspected
 * and dropping for an EOA (nothing to inspect).
 */
function deriveConfidence(report: ContractReport): number {
  if (!report.isContract) {
    return 90; // High confidence it is simply not a contract.
  }
  // Larger contracts give the heuristics more to work with, up to a cap.
  const sizeBonus = Math.min(20, Math.floor(report.bytecodeSize / 256));
  return clampScore(55 + sizeBonus);
}

function buildUserPrompt(
  input: ContractAuditInput,
  report: ContractReport,
  scored: readonly ScoredFinding[],
  riskScore: number,
  confidence: number,
): string {
  const firing = scored.length
    ? scored.map((s) => `- [${s.severity}] (${s.heuristic.code}) ${s.heuristic.note}`)
    : ["- (no notable heuristics fired)"];

  return [
    input.goal ?? "Perform a lightweight static review of this contract and explain the risks.",
    `Target: ${report.address}`,
    `Is contract: ${report.isContract} | bytecode size: ${report.bytecodeSize} bytes | balance: ${report.balanceMnt} MNT | source: ${report.source}`,
    `Deterministic risk=${riskScore}, confidence=${confidence}.`,
    "Heuristics that fired (severity is fixed by the runner — do not change it):",
    ...firing,
    "Write an overall summary, a finding (title + detail) for each fired heuristic " +
      "keyed by its code, and a plain-language human explanation. Reason only from " +
      "these facts.",
  ].join("\n");
}

/** Deterministic fallback used only on the offline mock path. */
function buildFallbackDecision(
  report: ContractReport,
  scored: readonly ScoredFinding[],
): ContractAuditLlmDecision {
  const summary = report.isContract
    ? `Static review of ${report.address}: ${report.bytecodeSize}-byte contract with ${scored.length} heuristic signal(s) worth a human review.`
    : `Static review of ${report.address}: no deployed bytecode — this is an externally-owned account, not a contract.`;

  return {
    summary,
    findings: scored.map(({ heuristic }) => ({
      code: heuristic.code,
      title: heuristic.title,
      detail: heuristic.note,
    })),
    humanExplanation: report.isContract
      ? `The target holds ${report.bytecodeSize} bytes of bytecode and ${report.balanceMnt} MNT. ` +
        `${scored.length} static heuristic(s) fired; these are triage signals, not confirmed ` +
        `vulnerabilities. A full audit (source verification, control-flow analysis) is recommended ` +
        `before trusting the contract with significant value.`
      : `The target address has no deployed code, so there is nothing to audit at the contract level. ` +
        `Treat it as an externally-owned account.`,
  };
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}
