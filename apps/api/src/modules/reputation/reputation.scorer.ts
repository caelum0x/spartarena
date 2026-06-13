import { computeTotalScore } from "@spartarena/shared";
import type { AgentOutput } from "@spartarena/shared";

/**
 * Deterministic Oracle Judge scoring.
 *
 * For the MVP the verifier is a trusted backend role; scores are derived
 * deterministically from the agent's structured output and timing so the demo is
 * reproducible. The four 0-100 components mirror ReputationEngine on-chain and
 * the weighted total uses the shared {@link computeTotalScore} (accuracy 40,
 * safety 30, speed 15, user 15).
 */

export interface ScoreComponents {
  readonly accuracy: number;
  readonly safety: number;
  readonly speed: number;
  readonly userRating: number;
}

export interface ScoredResult extends ScoreComponents {
  readonly totalScore: number;
}

function clamp(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

/**
 * Derive scores from a structured agent output and execution latency.
 *
 * • accuracy — anchored on the agent's self-reported confidence.
 * • safety   — inverse of risk, rewarding cautious recommendations.
 * • speed    — faster executions score higher (full marks under ~2s).
 * • user     — proxy from confidence + presence of a human explanation.
 */
export function scoreOutput(
  output: AgentOutput,
  latencyMs: number,
): ScoredResult {
  const confidence = output.confidence;
  const risk = output.riskScore;

  const accuracy = clamp(confidence);
  const safety = clamp(100 - risk * 0.6);
  const speed = clamp(100 - latencyMs / 60);
  const hasExplanation = output.humanExplanation.trim().length > 0;
  const userRating = clamp(confidence * 0.8 + (hasExplanation ? 20 : 0));

  const components: ScoreComponents = { accuracy, safety, speed, userRating };
  return { ...components, totalScore: computeTotalScore(components) };
}

/** Compute only the weighted total from explicit component scores. */
export function totalFromComponents(components: ScoreComponents): number {
  return computeTotalScore(components);
}
