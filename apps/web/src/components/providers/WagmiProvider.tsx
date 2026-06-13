"use client";

import type { ReactNode } from "react";
import { WagmiProvider as BaseWagmiProvider } from "wagmi";
import { wagmiConfig } from "@/config/wagmi";

/**
 * wagmi provider wrapping the app with the SpartArena chain/connector config.
 * Kept as its own client component so the root layout can stay a server
 * component and compose providers explicitly.
 */
export function WagmiProvider({ children }: { children: ReactNode }) {
  return <BaseWagmiProvider config={wagmiConfig}>{children}</BaseWagmiProvider>;
}
