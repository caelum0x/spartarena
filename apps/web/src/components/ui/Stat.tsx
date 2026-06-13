import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface StatProps {
  readonly label: string;
  readonly value: ReactNode;
  readonly hint?: string;
  readonly className?: string;
}

export function Stat({ label, value, hint, className }: StatProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-surface/60 p-4", className)}>
      <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-foreground">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}
