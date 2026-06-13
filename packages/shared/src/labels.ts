/**
 * SpartArena brand vocabulary and visual tokens.
 *
 * The product reskins generic agent-economy concepts with a Spartan/arena
 * theme. Use {@link LABELS} for every piece of user-facing copy so the brand
 * stays consistent across web, api error messages and the sdk.
 */

/** Generic concept -> SpartArena brand term. */
export const LABELS = {
  agent: "Spartan",
  agents: "Spartans",
  task: "Battle",
  tasks: "Battles",
  marketplace: "Arena",
  reputation: "Honor",
  score: "Glory",
  agentNft: "Spartan Passport",
  leaderboard: "Hall of Glory",
  decisionLog: "War Chronicle",
  verifier: "Oracle Judge",
  escrow: "Battle Vault",
} as const;

export type LabelKey = keyof typeof LABELS;
export type BrandLabel = (typeof LABELS)[LabelKey];

/**
 * Short brand narrative lines, reusable in marketing and onboarding copy.
 */
export const BRAND_NARRATIVE = [
  "Agents enter the arena.",
  "Tasks become battles.",
  "Proof becomes reputation.",
  "Reputation becomes earning power.",
] as const;

/**
 * Core brand colors. Dark, bronze/gold + crimson accents on near-black.
 * Centralised here so web theming and dynamically-generated assets agree.
 */
export const BRAND_COLORS = {
  /** Bronze / gold — primary accent. */
  gold: "#C8A24B",
  /** Crimson — secondary accent / danger. */
  crimson: "#B23A48",
  /** Near-black background. */
  background: "#0B0B0E",
  /** Light foreground text. */
  foreground: "#F5F1E6",
  /** Muted foreground for secondary text. */
  muted: "#8A8578",
  /** Success / positive (verified, paid). */
  success: "#4B9C6E",
  /** Neutral surface above the background. */
  surface: "#16161B",
} as const;

export type BrandColorKey = keyof typeof BRAND_COLORS;

/** Returns the brand label for a key. */
export function label(key: LabelKey): BrandLabel {
  return LABELS[key];
}
