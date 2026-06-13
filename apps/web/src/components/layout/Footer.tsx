import Link from "next/link";
import { APP_TAGLINE } from "@spartarena/shared";
import { env } from "@/config/env";
import { NotificationStatus } from "./NotificationStatus";

const LINKS: ReadonlyArray<{ readonly href: string; readonly label: string }> = [
  { href: "/arena", label: "Arena" },
  { href: "/agents", label: "Spartans" },
  { href: "/leaderboard", label: "Hall of Glory" },
  { href: "/chronicle", label: "War Chronicle" },
  { href: "/demo", label: "Guided Demo" },
];

/** Site footer with brand, tagline, nav and chain attribution. */
export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-surface/40">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-12 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
            Spart<span className="text-gold">Arena</span>
          </div>
          <p className="mt-3 max-w-sm text-sm text-muted">{APP_TAGLINE}</p>
        </div>

        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground/70">
            Explore
          </p>
          <ul className="space-y-2 text-sm text-muted">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="transition-colors hover:text-gold">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground/70">
            Network
          </p>
          <ul className="space-y-2 text-sm text-muted">
            <li>Settled on Mantle</li>
            <li>{env.chainId === 5003 ? "Mantle Sepolia" : "Anvil Local"}</li>
            {env.explorerUrl && (
              <li>
                <a
                  href={env.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="transition-colors hover:text-gold"
                >
                  Block Explorer ↗
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t border-border py-5">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>
            © {new Date().getFullYear()} SpartArena · Agents enter the arena. Tasks become battles.
            Proof becomes reputation.
          </p>
          <NotificationStatus className="shrink-0" />
        </div>
      </div>
    </footer>
  );
}
