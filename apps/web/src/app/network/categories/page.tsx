"use client";

import Link from "next/link";
import { Container, PageHeader } from "@/components/ui/Container";
import { NetworkTabs } from "@/components/network/NetworkTabs";
import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import {
  useMantleCategories,
  type MantleCategory,
} from "@/hooks/useMantleCategories";
import { formatUsd } from "@/lib/format";
import { cn } from "@/lib/cn";

/** Share of total as a percentage string with one decimal. */
function sharePct(value: number, total: number): string {
  if (total <= 0) return "0.0%";
  return `${((value / total) * 100).toFixed(1)}%`;
}

interface CategoryRowProps {
  readonly category: MantleCategory;
  readonly total: number;
  readonly max: number;
}

/** A single ranked category row: name, protocol count, TVL, share + bar. */
function CategoryRow({ category, total, max }: CategoryRowProps) {
  const barWidth = max > 0 ? Math.max(2, (category.tvl / max) * 100) : 0;
  return (
    <div className="border-t border-border py-4 first:border-t-0 first:pt-0">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-base font-semibold text-foreground">
            {category.category}
          </span>
          <Badge tone="muted" className="ml-1">
            {category.count} {category.count === 1 ? "protocol" : "protocols"}
          </Badge>
        </div>
        <div className="text-right">
          <span className="font-display text-base font-semibold text-foreground">
            {formatUsd(category.tvl)}
          </span>
          <span className="ml-2 text-xs text-muted">
            {sharePct(category.tvl, total)}
          </span>
        </div>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className={cn("h-full rounded-full bg-gold")}
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  );
}

export default function NetworkCategoriesPage() {
  const categoriesQuery = useMantleCategories();
  const data = categoriesQuery.data;

  const categories = data?.categories ?? [];
  const total = data?.totalTvl ?? 0;
  const max = categories.length > 0 ? categories[0]!.tvl : 0;
  const dominant = categories.length > 0 ? categories[0]! : null;

  return (
    <Container className="py-12">
      <PageHeader
        eyebrow="Mantle"
        title="TVL by Category"
        description="How Mantle's total value locked splits across DeFi categories — Lending, Dexs, RWA, Yield Aggregator and more — sourced from DefiLlama."
      />

      <NetworkTabs />

      {categoriesQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : categoriesQuery.isError || !data ? (
        <Card className="border-crimson/30 bg-crimson/5 p-6">
          <p className="font-display text-lg font-semibold text-crimson-soft">
            Could not load Mantle category data
          </p>
          <p className="mt-2 text-sm text-muted">
            The DefiLlama feed is temporarily unavailable. Please try again shortly.
          </p>
          <button
            type="button"
            onClick={() => void categoriesQuery.refetch()}
            className="mt-4 inline-flex items-center rounded-lg border border-gold/40 bg-gold/10 px-3 py-1.5 text-sm font-semibold text-gold transition-colors hover:bg-gold/20"
          >
            Retry
          </button>
        </Card>
      ) : categories.length === 0 ? (
        <Card className="p-6">
          <p className="font-display text-lg font-semibold text-foreground">
            No categories found on Mantle
          </p>
          <p className="mt-2 text-sm text-muted">
            DefiLlama is not reporting any protocol TVL on Mantle right now.
          </p>
        </Card>
      ) : (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Stat
              label="Total TVL"
              value={formatUsd(total)}
              hint="Total value locked on Mantle"
            />
            <Stat
              label="Categories"
              value={String(categories.length)}
              hint="Distinct DeFi categories on Mantle"
            />
            <Stat
              label="Dominant category"
              value={
                dominant ? (
                  <span className="flex items-center gap-2">
                    <span>{dominant.category}</span>
                    <Badge tone="gold">{sharePct(dominant.tvl, total)}</Badge>
                  </span>
                ) : (
                  "—"
                )
              }
              hint="Largest share of TVL"
            />
          </div>

          <Card className="p-6">
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <h2 className="font-display text-lg font-bold text-foreground">
                TVL by category
              </h2>
              <span className="text-xs text-muted">Share of total on Mantle</span>
            </div>
            <div>
              {categories.map((category) => (
                <CategoryRow
                  key={category.category}
                  category={category}
                  total={total}
                  max={max}
                />
              ))}
            </div>
          </Card>

          <p className="text-xs text-muted">
            Source:{" "}
            <Link
              href="https://defillama.com/chain/Mantle"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-gold hover:underline"
            >
              DefiLlama
            </Link>
          </p>
        </div>
      )}
    </Container>
  );
}
