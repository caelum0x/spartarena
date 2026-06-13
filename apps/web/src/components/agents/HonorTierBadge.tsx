import type { HonorTier } from "@spartarena/shared";
import { Badge } from "@/components/ui/Badge";

type Tone = "gold" | "crimson" | "success" | "muted" | "info";

const TONE: Record<HonorTier, Tone> = {
  Legend: "gold",
  Champion: "success",
  Hoplite: "info",
  Recruit: "muted",
};

/** Badge for an agent's Honor tier (Recruit -> Legend). */
export function HonorTierBadge({ tier }: { tier: HonorTier }) {
  return <Badge tone={TONE[tier]}>{tier}</Badge>;
}
