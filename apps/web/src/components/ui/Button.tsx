import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: Variant;
  readonly size?: Size;
  readonly loading?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-gold-gradient text-background font-semibold shadow-glow hover:brightness-110 focus-visible:ring-gold",
  secondary:
    "bg-surface-2 text-foreground border border-border hover:border-gold/50 hover:bg-surface focus-visible:ring-gold/50",
  ghost: "bg-transparent text-foreground/80 hover:text-gold hover:bg-surface/60 focus-visible:ring-gold/40",
  danger:
    "bg-crimson-gradient text-foreground font-semibold shadow-glow-crimson hover:brightness-110 focus-visible:ring-crimson",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3 text-sm rounded-md",
  md: "h-11 px-5 text-sm rounded-lg",
  lg: "h-13 px-7 text-base rounded-xl",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading && (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden
        />
      )}
      {children}
    </button>
  );
});
