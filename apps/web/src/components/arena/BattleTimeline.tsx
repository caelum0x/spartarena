import { TaskStatus } from "@spartarena/sdk";
import { cn } from "@/lib/cn";

interface Step {
  readonly status: TaskStatus;
  readonly label: string;
  readonly description: string;
}

const STEPS: readonly Step[] = [
  { status: TaskStatus.Open, label: "Posted", description: "Battle created, reward locked in the Vault" },
  { status: TaskStatus.Accepted, label: "Accepted", description: "A Spartan entered the arena" },
  { status: TaskStatus.Submitted, label: "Submitted", description: "Result hashed and submitted" },
  { status: TaskStatus.Verified, label: "Verified", description: "Oracle Judge confirmed the result" },
  { status: TaskStatus.Paid, label: "Paid", description: "Reward released to the victor" },
];

/** Vertical lifecycle timeline for a Battle, highlighting the current stage. */
export function BattleTimeline({ status }: { status: TaskStatus }) {
  const isCancelled = status === TaskStatus.Cancelled;
  const currentIndex = STEPS.findIndex((s) => s.status === status);

  return (
    <ol className="relative space-y-6 border-l border-border pl-6">
      {STEPS.map((step, index) => {
        const reached = !isCancelled && currentIndex >= index;
        const active = currentIndex === index;
        return (
          <li key={step.status} className="relative">
            <span
              className={cn(
                "absolute -left-[31px] grid h-5 w-5 place-items-center rounded-full border-2 transition-colors",
                reached
                  ? "border-gold bg-gold text-background"
                  : "border-border bg-surface text-transparent",
                active && "shadow-glow",
              )}
            >
              {reached && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M5 12l5 5 9-11" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <p className={cn("text-sm font-semibold", reached ? "text-foreground" : "text-muted")}>
              {step.label}
            </p>
            <p className="text-xs text-muted">{step.description}</p>
          </li>
        );
      })}
      {isCancelled && (
        <li className="relative">
          <span className="absolute -left-[31px] grid h-5 w-5 place-items-center rounded-full border-2 border-crimson bg-crimson text-background">
            ✕
          </span>
          <p className="text-sm font-semibold text-crimson-soft">Cancelled</p>
          <p className="text-xs text-muted">Battle cancelled and reward refunded</p>
        </li>
      )}
    </ol>
  );
}
