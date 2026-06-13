import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  readonly glow?: boolean;
  readonly interactive?: boolean;
}

export function Card({ glow, interactive, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface/80 p-6 shadow-card backdrop-blur-sm",
        interactive && "transition-all duration-300 hover:-translate-y-1 hover:border-gold/40 hover:shadow-glow",
        glow && "shadow-glow",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mb-4 flex items-start justify-between gap-4", className)}>{children}</div>;
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h3 className={cn("font-display text-lg font-semibold text-foreground", className)}>{children}</h3>
  );
}
