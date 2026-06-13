"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { useProjectChronicle } from "@/hooks/useProjects";
import { txUrl } from "@/lib/explorer";
import { formatDate } from "@/lib/format";
import type { ProjectChronicleEventView, ProjectView } from "@/types";

function typeTone(type: ProjectChronicleEventView["type"]): "success" | "gold" | "muted" | "info" {
  if (type === "DECISION_RECORDED") return "success";
  if (type === "BATTLE_CREATED") return "gold";
  if (type === "PROJECT_CREATED") return "info";
  return "muted";
}

function typeLabel(type: ProjectChronicleEventView["type"]): string {
  switch (type) {
    case "PROJECT_CREATED":
      return "Project";
    case "BATTLE_CREATED":
      return "Battle";
    case "BATTLE_STATUS":
      return "Status";
    case "DECISION_RECORDED":
      return "Proof";
  }
}

export function ProjectChroniclePanel({ project }: { project: ProjectView }) {
  const { data, isLoading, isError } = useProjectChronicle(project.slug);
  const events = data?.data ?? [];

  return (
    <Card className="mt-8">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
            Project Chronicle
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold text-foreground">
            Proof and Battle history
          </h2>
          <p className="mt-1 text-sm text-muted">
            Campaign activity grouped from Battles and War Chronicle decision proofs.
          </p>
        </div>
        <Badge tone="muted">{events.length} event(s)</Badge>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner className="h-6 w-6" />
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-crimson/30 bg-crimson/5 p-4 text-sm text-crimson-soft">
          Could not load Project Chronicle.
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-xl border border-border bg-background/35 p-4 text-sm text-muted">
          No Project Chronicle events yet.
        </div>
      ) : (
        <div className="space-y-3">
          {events.slice(0, 8).map((event) => (
            <ChronicleRow key={event.id} event={event} />
          ))}
        </div>
      )}
    </Card>
  );
}

function ChronicleRow({ event }: { event: ProjectChronicleEventView }) {
  const eventDate = Math.floor(new Date(event.timestamp).getTime() / 1000);
  const battleHref = event.chainTaskId !== null ? `/arena/${event.chainTaskId}` : null;
  const proofHref = event.txHash ? txUrl(event.txHash) : null;

  return (
    <div className="rounded-xl border border-border bg-background/35 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={typeTone(event.type)}>{typeLabel(event.type)}</Badge>
            <h3 className="font-display text-base font-semibold text-foreground">{event.title}</h3>
            {event.actionType && <Badge tone="muted">{event.actionType}</Badge>}
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted">{event.description}</p>
          {event.battleTitle && (
            <p className="mt-2 truncate text-xs text-muted">
              Battle:{" "}
              {battleHref ? (
                <Link href={battleHref} className="text-gold hover:text-gold-light">
                  {event.battleTitle}
                </Link>
              ) : (
                <span>{event.battleTitle}</span>
              )}
            </p>
          )}
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-2 text-center sm:w-64">
          <MiniMetric label="Date" value={Number.isFinite(eventDate) ? formatDate(eventDate) : "Unknown"} />
          <MiniMetric
            label="Risk"
            value={event.riskScore !== null ? `${event.riskScore}%` : "None"}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-xs text-muted">
        <div className="flex flex-wrap gap-3">
          {event.confidence !== null && <span>Confidence {event.confidence}%</span>}
          {event.chainDecisionId !== null && <span>Decision #{event.chainDecisionId}</span>}
          {event.chainTaskId !== null && <span>Battle #{event.chainTaskId}</span>}
        </div>
        {proofHref && (
          <a
            href={proofHref}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-gold hover:text-gold-light"
          >
            View transaction
          </a>
        )}
      </div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface/60 px-2 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-0.5 font-display text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
