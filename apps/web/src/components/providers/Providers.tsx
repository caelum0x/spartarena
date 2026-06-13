"use client";

import type { ReactNode } from "react";
import { WagmiProvider } from "./WagmiProvider";
import { QueryProvider } from "./QueryProvider";
import { ToastProvider } from "./ToastProvider";
import { ToastViewport } from "@/components/ui/Toast";

/**
 * Composes all client-side providers in the correct order:
 * Wagmi -> React Query (wagmi v2 depends on it) -> Toasts.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider>
      <QueryProvider>
        <ToastProvider>
          {children}
          <ToastViewport />
        </ToastProvider>
      </QueryProvider>
    </WagmiProvider>
  );
}
