import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "gold" | "crimson" | "success" | "muted" | "info";

const TONES: Record<Tone, string> = {
  gold: "bg-gold/10 text-gold border-gold/30",
  crimson: "bg-crimson/10 text-crimson-soft border-crimson/30",
  success: "bg-success/10 text-success border-success/30",
  muted: "bg-surface-2 text-muted border-border",
  info: "bg-foreground/5 text-foreground/80 border-border",
};

export interface BadgeProps {
  readonly tone?: Tone;
  readonly children: ReactNode;
  readonly className?: string;
}

export function Badge({ tone = "muted", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
