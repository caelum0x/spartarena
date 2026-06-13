"use client";

import Link from "next/link";
import { Container, PageHeader } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import { Sparkline } from "@/components/ui/Sparkline";
import { useGasHistory } from "@/hooks/useGasHistory";

/** Gauge thresholds (in GWEI) for the cheap / normal / elevated bands. */
const CHEAP_BELOW = 30;
const NORMAL_BELOW = 80;

type Tone = "gold" | "crimson" | "success";

interface Gauge {
  readonly label: string;
  readonly tone: Tone;
}

/** Classify a GWEI reading into a labelled, on-brand gauge band. */
function gaugeFor(gwei: number): Gauge {
  if (gwei < CHEAP_BELOW) return { label: "Cheap", tone: "success" };
  if (gwei < NORMAL_BELOW) return { label: "Normal", tone: "gold" };
  return { label: "Elevated", tone: "crimson" };
}

/** Format a GWEI number to a fixed single decimal (e.g. "50.0"). */
function gwei(value: number): string {
  return value.toFixed(1);
}

/** A small pulsing dot used as a "live" indicator. */
function LiveDot() {
  return (
    <span className="relative inline-flex h-2.5 w-2.5">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
    </span>
  );
}

export default function GasTrackerPage() {
  const { history, current, min, max, avg, ready, error } = useGasHistory();

  const gauge = current !== null ? gaugeFor(current) : null;
  const hardDown = error && history.length === 0;

  return (
    <Container className="py-12">
      <PageHeader
        eyebrow="Mantle"
        title="Gas Tracker"
        description="Live Mantle gas price, polled from the real public RPC every 10 seconds this session. The sparkline below is built in-memory from your current visit — no mock data, and history resets when you reload."
        actions={
          <Badge tone="success">
            <LiveDot />
            <span className="ml-1">Live</span>
          </Badge>
        }
      />

      <div className="mb-8">
        <Link
          href="/network"
          className="inline-flex items-center gap-1 text-sm font-medium text-gold transition-colors hover:text-gold/80"
        >
          <span aria-hidden>←</span> Network
        </Link>
      </div>

      {hardDown ? (
        <Card className="border-crimson/30 bg-crimson/5 p-6">
          <p className="font-display text-lg font-semibold text-crimson-soft">
            Could not reach the Mantle RPC
          </p>
          <p className="mt-2 text-sm text-muted">
            We could not read a gas price from the Mantle network. The tracker will keep retrying
            every 10 seconds — readings will appear here as soon as the RPC responds.
          </p>
        </Card>
      ) : (
        <div className="space-y-8">
          <Card className="p-6">
            <p className="text-xs uppercase tracking-wider text-muted">Current gas price</p>
            <div className="mt-2 flex flex-wrap items-center gap-4">
              {current !== null ? (
                <span className="font-display text-5xl font-bold text-foreground">
                  {gwei(current)}{" "}
                  <span className="text-2xl font-semibold text-muted">Gwei</span>
                </span>
              ) : (
                <span className="flex items-center gap-3 text-muted">
                  <Spinner className="h-6 w-6" />
                  <span className="text-sm">Reading the Mantle RPC…</span>
                </span>
              )}
              {gauge && <Badge tone={gauge.tone}>{gauge.label}</Badge>}
            </div>
            {error && ready && (
              <p className="mt-3 text-xs text-crimson-soft">
                Last poll failed — showing the most recent successful reading.
              </p>
            )}
          </Card>

          <Card className="p-6">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="font-display text-lg font-bold text-foreground">This session</h2>
              <span className="text-xs text-muted">In-session only · resets on reload</span>
            </div>
            {history.length >= 2 ? (
              <Sparkline data={history} className="text-gold w-full" height={72} />
            ) : (
              <div className="flex items-center gap-3 py-6 text-muted">
                <Spinner className="h-5 w-5" />
                <span className="text-sm">Collecting readings…</span>
              </div>
            )}
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Current"
              value={current !== null ? `${gwei(current)} Gwei` : "—"}
              hint="Latest reading"
            />
            <Stat
              label="Session min"
              value={ready ? `${gwei(min)} Gwei` : "—"}
              hint="Lowest this session"
            />
            <Stat
              label="Session max"
              value={ready ? `${gwei(max)} Gwei` : "—"}
              hint="Highest this session"
            />
            <Stat
              label="Session avg"
              value={ready ? `${gwei(avg)} Gwei` : "—"}
              hint={`Over ${history.length} reading${history.length === 1 ? "" : "s"}`}
            />
          </div>
        </div>
      )}
    </Container>
  );
}
