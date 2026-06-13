import { REPUTATION_WEIGHTS } from "@spartarena/shared";
import { cn } from "@/lib/cn";

export interface ReputationBreakdownProps {
  readonly accuracy: number;
  readonly safety: number;
  readonly speed: number;
  readonly userRating: number;
  readonly compact?: boolean;
}

const BARS = [
  { key: "accuracy", label: "Accuracy", weight: REPUTATION_WEIGHTS.accuracy },
  { key: "safety", label: "Safety", weight: REPUTATION_WEIGHTS.safety },
  { key: "speed", label: "Speed", weight: REPUTATION_WEIGHTS.speed },
  { key: "userRating", label: "User", weight: REPUTATION_WEIGHTS.userRating },
] as const;

/** Horizontal weighted-bar breakdown of the four Honor components. */
export function ReputationBreakdown(props: ReputationBreakdownProps) {
  const values: Record<(typeof BARS)[number]["key"], number> = {
    accuracy: props.accuracy,
    safety: props.safety,
    speed: props.speed,
    userRating: props.userRating,
  };

  return (
    <div className={cn("space-y-2", props.compact && "space-y-1.5")}>
      {BARS.map((bar) => {
        const value = Math.min(100, Math.max(0, values[bar.key]));
        return (
          <div key={bar.key} className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-xs text-muted">{bar.label}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-background/60">
              <div
                className="h-full rounded-full bg-gold-gradient"
                style={{ width: `${value}%` }}
              />
            </div>
            <span className="w-8 shrink-0 text-right font-mono text-xs text-gold">{value}</span>
            {!props.compact && (
              <span className="w-10 shrink-0 text-right text-[10px] text-muted">×{bar.weight}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
