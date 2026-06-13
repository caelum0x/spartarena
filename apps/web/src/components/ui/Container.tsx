import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Centered, width-constrained page container. */
export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-6xl px-5 sm:px-8", className)}>{children}</div>;
}

export interface PageHeaderProps {
  readonly eyebrow?: string;
  readonly title: ReactNode;
  readonly description?: ReactNode;
  readonly actions?: ReactNode;
}

/** Standard page header with eyebrow, title, description and optional actions. */
export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-gold">{eyebrow}</p>
        )}
        <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">{title}</h1>
        {description && <p className="mt-3 text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
    </div>
  );
}
