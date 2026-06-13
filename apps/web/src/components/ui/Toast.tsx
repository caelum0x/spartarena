"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useToast, type ToastVariant } from "@/components/providers/ToastProvider";
import { cn } from "@/lib/cn";

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: "border-success/40 bg-success/10",
  error: "border-crimson/40 bg-crimson/10",
  info: "border-gold/40 bg-gold/10",
};

/** Fixed viewport that renders queued toasts. Mounted once in Providers. */
export function ToastViewport() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[60] flex w-full max-w-sm flex-col gap-3">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, x: 40, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className={cn(
              "pointer-events-auto rounded-xl border p-4 shadow-card backdrop-blur",
              VARIANT_STYLES[toast.variant],
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{toast.title}</p>
                {toast.description && (
                  <p className="mt-0.5 text-xs text-foreground/70">{toast.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="text-muted hover:text-foreground"
                aria-label="Dismiss notification"
              >
                ✕
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
