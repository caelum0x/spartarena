"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

/** Byreal sub-navigation, grouped by purpose so the deep tool set stays legible. */
const GROUPS: ReadonlyArray<ReadonlyArray<{ href: string; label: string }>> = [
  [
    { href: "/byreal/insights", label: "Insights" },
    { href: "/byreal", label: "Pools" },
    { href: "/byreal/tokens", label: "Tokens" },
    { href: "/byreal/search", label: "Search" },
  ],
  [
    { href: "/byreal/yield", label: "Yield" },
    { href: "/byreal/depth", label: "Depth" },
    { href: "/byreal/compare", label: "Compare" },
    { href: "/byreal/pool-compare", label: "Pool Compare" },
  ],
  [
    { href: "/byreal/simulate", label: "Simulate" },
    { href: "/byreal/strategy", label: "Strategy" },
  ],
  [
    { href: "/byreal/swap", label: "Swap" },
    { href: "/byreal/positions", label: "Positions" },
    { href: "/byreal/watchlist", label: "Watchlist" },
  ],
];

/** Grouped segmented nav across the Byreal boards and tools. */
export function ByrealTabs() {
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
