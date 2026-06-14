"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Container, PageHeader } from "@/components/ui/Container";
import { NetworkTabs } from "@/components/network/NetworkTabs";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Stat } from "@/components/ui/Stat";
import { Spinner } from "@/components/ui/Spinner";
import { Input } from "@/components/ui/Input";
import { useMantleProtocols, type MantleProtocol } from "@/hooks/useMantleProtocols";
import { formatUsd } from "@/lib/format";
import { cn } from "@/lib/cn";

const ALL = "All";
const MAX_CATEGORY_PILLS = 6;

export default function MantleProtocolsPage() {
  const { data, isLoading, isError, error } = useMantleProtocols();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(ALL);

  const all = useMemo<readonly MantleProtocol[]>(() => data ?? [], [data]);

  /** Distinct categories present, ranked by count, capped — plus an "All" pill. */
  const categories = useMemo<readonly string[]>(() => {
    const counts = new Map<string, number>();
    for (const p of all) {
      const key = p.category ?? "Other";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const top = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_CATEGORY_PILLS)
      .map(([name]) => name);
    return [ALL, ...top];
  }, [all]);

  const protocols = useMemo<readonly MantleProtocol[]>(() => {
    const q = query.trim().toLowerCase();
    return all.filter((p) => {
      if (category !== ALL && (p.category ?? "Other") !== category) return false;
      if (q.length > 0 && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [all, query, category]);

  const summary = useMemo(() => {
    const totalTvl = protocols.reduce((sum, p) => sum + p.mantleTvl, 0);
    const counts = new Map<string, number>();
    for (const p of protocols) {
      const key = p.category ?? "Other";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const topCategory =
      [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
    return {
      count: protocols.length,
      totalTvl,
      categories: counts.size,
      topCategory,
    };
  }, [protocols]);

  /** Largest TVL among the listed protocols — used to scale the share bars. */
  const maxTvl = useMemo(
    () => protocols.reduce((max, p) => Math.max(max, p.mantleTvl), 0),
    [protocols],
  );

  return (
    <Container className="py-12">
      <PageHeader
        eyebrow="Mantle"
        title="Mantle Protocols"
        description="The largest DeFi protocols on Mantle by total value locked — real on-chain TVL aggregated from DefiLlama and ranked by Mantle-chain TVL."
      />

      <NetworkTabs />

      {!isLoading && !isError && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Protocols" value={summary.count.toString()} />
          <Stat
            label="Total Mantle TVL"
            value={formatUsd(summary.totalTvl)}
            hint="Across listed protocols"
          />
          <Stat label="Categories" value={summary.categories.toString()} />
          <Stat label="Top Category" value={summary.topCategory} />
        </div>
      )}

      {!isLoading && !isError && (
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search protocol…"
            aria-label="Search protocols by name"
            className="lg:max-w-md"
          />
          <div className="flex flex-wrap gap-2">
            {categories.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setCategory(key)}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-sm font-medium transition-all",
                  category === key
                    ? "border-gold bg-gold/15 text-gold"
                    : "border-border bg-surface/50 text-muted hover:text-foreground",
                )}
              >
                {key}
              </button>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner className="h-8 w-8" />
        </div>
      ) : isError ? (
        <Card className="border-crimson/30 bg-crimson/5 p-10 text-center">
          <p className="font-display text-lg font-semibold text-crimson-soft">
            Could not load Mantle protocols.
          </p>
          {error instanceof Error && (
            <span className="mt-1 block text-sm text-muted">{error.message}</span>
          )}
        </Card>
      ) : protocols.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface/60 p-10 text-center text-muted">
          No Mantle protocols match this view.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {protocols.map((protocol, index) => {
            const rank = index + 1;
            const isTop = rank === 1;
            const share = maxTvl > 0 ? (protocol.mantleTvl / maxTvl) * 100 : 0;
            return (
              <Card
                key={`${protocol.name}-${protocol.slug ?? rank}`}
                glow={isTop}
                className={cn(isTop && "border-gold/40")}
              >
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border font-display text-lg font-bold",
                        isTop
                          ? "border-gold/40 bg-gold/15 text-gold"
                          : "border-border bg-surface/60 text-muted",
                      )}
                    >
                      {rank}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {protocol.logo && (
                          // eslint-disable-next-line @next/next/no-img-element -- external DefiLlama logo URLs; no next/image remote config needed
                          <img
                            src={protocol.logo}
                            alt={protocol.name}
                            width={28}
                            height={28}
                            className="h-7 w-7 shrink-0 rounded-full border border-border bg-surface object-contain"
                          />
                        )}
                        {protocol.slug ? (
                          <Link
                            href={`https://defillama.com/protocol/${protocol.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-display text-lg font-semibold text-foreground hover:text-gold"
                          >
                            {protocol.name}
                          </Link>
                        ) : (
                          <span className="font-display text-lg font-semibold text-foreground">
                            {protocol.name}
                          </span>
                        )}
                        {protocol.category && <Badge tone="info">{protocol.category}</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 sm:text-right">
                    <p className="text-xs uppercase tracking-wider text-muted">Mantle TVL</p>
                    <p className="font-display text-3xl font-bold text-gold">
                      {formatUsd(protocol.mantleTvl)}
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-gold/60 to-gold"
                      style={{ width: `${Math.max(2, share)}%` }}
                    />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <p className="mt-8 text-center text-xs text-muted">Source: DefiLlama</p>
    </Container>
  );
}
