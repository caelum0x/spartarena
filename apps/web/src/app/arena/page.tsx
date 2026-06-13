"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { TaskStatus } from "@spartarena/sdk";
import { Container, PageHeader } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { BattleCard } from "@/components/arena/BattleCard";
import { Input } from "@/components/ui/Input";
import { SkeletonGrid } from "@/components/ui/SkeletonGrid";
import { DataSourceNotice } from "@/components/ui/DataSourceNotice";
import { useTasks } from "@/hooks/useTasks";
import { taskStatusLabel } from "@/lib/format";
import { cn } from "@/lib/cn";

const FILTERS: ReadonlyArray<{ readonly key: TaskStatus | "all"; readonly label: string }> = [
  { key: "all", label: "All" },
  { key: TaskStatus.Open, label: taskStatusLabel(TaskStatus.Open) },
  { key: TaskStatus.Accepted, label: taskStatusLabel(TaskStatus.Accepted) },
  { key: TaskStatus.Submitted, label: taskStatusLabel(TaskStatus.Submitted) },
  { key: TaskStatus.Verified, label: taskStatusLabel(TaskStatus.Verified) },
  { key: TaskStatus.Paid, label: taskStatusLabel(TaskStatus.Paid) },
];

type SortKey = "newest" | "reward-desc" | "reward-asc";

const SORTS: ReadonlyArray<{ readonly key: SortKey; readonly label: string }> = [
  { key: "newest", label: "Newest" },
  { key: "reward-desc", label: "Reward ↓" },
  { key: "reward-asc", label: "Reward ↑" },
];

export default function ArenaPage() {
  const { data, isLoading } = useTasks();
  const [filter, setFilter] = useState<TaskStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");

  const tasks = data?.data;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = (tasks ?? [])
      .filter((t) => filter === "all" || t.status === filter)
      .filter(
        (t) =>
          q === "" ||
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          String(t.taskId).includes(q),
      );

    const sorted = [...matched];
    if (sort === "reward-desc") {
      sorted.sort((a, b) => (b.rewardWei > a.rewardWei ? 1 : b.rewardWei < a.rewardWei ? -1 : 0));
    } else if (sort === "reward-asc") {
      sorted.sort((a, b) => (a.rewardWei > b.rewardWei ? 1 : a.rewardWei < b.rewardWei ? -1 : 0));
    } else {
      sorted.sort((a, b) => b.taskId - a.taskId);
    }
    return sorted;
  }, [tasks, filter, query, sort]);

  return (
    <Container className="py-12">
      <PageHeader
        eyebrow="Arena"
        title={
          <span className="inline-flex items-center">
            The Arena
            {data && <DataSourceNotice source={data.source} />}
          </span>
        }
        description="Open Battles where Spartans compete for MNT rewards. Every result is verified and paid on-chain."
        actions={
          <Link href="/arena/new">
            <Button>Post a Battle</Button>
          </Link>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search battles by title, description or #id…"
          aria-label="Search battles"
          className="sm:max-w-sm"
        />
        <div className="flex flex-wrap gap-2">
          {SORTS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSort(s.key)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                sort === s.key
                  ? "border-gold bg-gold/15 text-gold"
                  : "border-border bg-surface/50 text-muted hover:text-foreground",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={String(f.key)}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-all",
              filter === f.key
                ? "border-gold bg-gold/15 text-gold"
                : "border-border bg-surface/50 text-muted hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <SkeletonGrid />
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface/60 p-12 text-center">
          <p className="text-muted">No Battles in this category yet.</p>
          <Link href="/arena/new" className="mt-4 inline-block">
            <Button variant="secondary">Be the first to post one</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((task) => (
            <BattleCard key={task.taskId} task={task} />
          ))}
        </div>
      )}
    </Container>
  );
}
