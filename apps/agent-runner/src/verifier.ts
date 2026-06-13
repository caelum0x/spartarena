import type { AgentOutput } from "./schemas.js";
import type { VerifierScore } from "./chain/writer.js";

/**
 * Deterministic MVP verifier. A real verifier would re-run tools and compare;
 * here we score structural quality: evidence richness (accuracy), conservative
 * risk handling (safety), latency (speed), and a fixed user rating proxy.
 */
export function scoreOutput(output: AgentOutput, elapsedMs: number): VerifierScore {
  const evidenceCount = evidenceCountFor(output);

  const accuracy = clamp(50 + evidenceCount * 20 + Math.round(output.confidence / 10));
  // Safety measures calibration, not a magic risk midpoint: an agent is "safe"
  // when its confidence justifies the risk it reports. Flagging high risk you're
  // unsure about (riskScore > confidence) is penalised; a confident, well-justified
  // call — high OR low risk — scores full marks. This no longer punishes a correct
  // low-risk conclusion (e.g. an EOA audit) the way `100 - |risk - 60|` did.
  const safety = clamp(100 - Math.max(0, output.riskScore - output.confidence));
  // Speed: full marks under 2s, decaying after.
  const speed = clamp(100 - Math.max(0, Math.round((elapsedMs - 2000) / 100)));
  const userRating = 80;

  return { accuracy, safety, speed, userRating };
}

/**
 * Number of independent evidence items the output rests on — exhaustive over the
 * AgentOutput union so adding a new agent forces a decision here. ALPHA_ALERT
 * counts transfers, RWA_STRATEGY counts assets, BYREAL_POOL_ANALYSIS counts pools,
 * CONTRACT_AUDIT counts findings.
 */
function evidenceCountFor(output: AgentOutput): number {
  switch (output.decisionType) {
    case "ALPHA_ALERT":
      return output.evidence.length;
    case "RWA_STRATEGY":
      return output.assets.length;
    case "BYREAL_POOL_ANALYSIS":
      return output.pools.length;
    case "CONTRACT_AUDIT":
      return output.findings.length;
    default: {
      const _exhaustive: never = output;
      return _exhaustive;
    }
  }
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, n));
}
