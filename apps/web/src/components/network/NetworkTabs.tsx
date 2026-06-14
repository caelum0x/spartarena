"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

/** Mantle network/ecosystem sub-nav, grouped by purpose. */
const GROUPS: ReadonlyArray<ReadonlyArray<{ href: string; label: string }>> = [
  [
    { href: "/network", label: "Overview" },
    { href: "/network/chains", label: "Chains" },
    { href: "/network/blocks", label: "Blocks" },
    { href: "/network/gas", label: "Gas" },
  ],
  [
    { href: "/network/defi", label: "DeFi" },
    { href: "/network/tvl", label: "TVL" },
    { href: "/network/yields", label: "Yields" },
    { href: "/network/dexs", label: "DEXs" },
    { href: "/network/fees", label: "Fees" },
  ],
  [
    { href: "/network/protocols", label: "Protocols" },
    { href: "/network/categories", label: "Categories" },
    { href: "/network/stablecoins", label: "Stablecoins" },
  ],
  [{ href: "/network/calculator", label: "Calculator" }],
];

/** Grouped sub-navigation across the Mantle network/ecosystem pages. */
export function NetworkTabs() {
  const pathname = usePathname();
  return (
    <div className="mb-6 flex flex-wrap items-center gap-1 rounded-xl border border-border bg-surface/50 p-1">
      {GROUPS.map((group, gi) => (
        <div key={gi} className="flex flex-wrap items-center gap-1">
          {gi > 0 && <span className="mx-1 hidden h-4 w-px bg-border sm:block" />}
          {group.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors",
                  active ? "bg-gold/15 text-gold" : "text-muted hover:text-foreground",
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}
