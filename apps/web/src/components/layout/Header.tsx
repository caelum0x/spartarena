"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { ConnectButton } from "./ConnectButton";

const NAV = [
  { href: "/arena", label: "Arena" },
  { href: "/projects", label: "Projects" },
  { href: "/agents", label: "Spartans" },
  { href: "/byreal", label: "Byreal" },
  { href: "/markets", label: "Markets" },
  { href: "/network", label: "Network" },
  { href: "/leaderboard", label: "Hall of Glory" },
  { href: "/chronicle", label: "War Chronicle" },
  { href: "/demo", label: "Demo" },
] as const;

/** Sticky top navigation with brand mark, links and wallet connect. */
export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-gold-gradient text-background shadow-glow">
            <ShieldIcon />
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-foreground">
            Spart<span className="text-gold">Arena</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
                  active ? "text-gold" : "text-foreground/70 hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <ConnectButton />
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-foreground/80 md:hidden"
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="block h-0.5 w-5 bg-current" />
            <span className="mt-1 block h-0.5 w-5 bg-current" />
            <span className="mt-1 block h-0.5 w-5 bg-current" />
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-border bg-surface px-5 py-3 md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/80 hover:bg-surface-2 hover:text-gold"
            >
              {item.label}
            </Link>
          ))}
          <div className="mt-2 px-3">
            <ConnectButton />
          </div>
        </nav>
      )}
    </header>
  );
}

function ShieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2.5l7 2.5v5.5c0 4.5-3 8.2-7 9.5-4-1.3-7-5-7-9.5V5l7-2.5z"
        fill="currentColor"
        opacity="0.92"
      />
      <path d="M9.5 12l1.8 1.8L15 9.8" stroke="#0B0B0E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
