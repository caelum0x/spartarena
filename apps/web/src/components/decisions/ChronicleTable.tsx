import Link from "next/link";
import { cn } from "@/lib/cn";
import type { DecisionView } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { shortHash } from "@/lib/hash";
import { pct, timeAgo } from "@/lib/format";
import { txUrl } from "@/lib/explorer";

export interface ChronicleTableProps {
  readonly decisions: readonly DecisionView[];
  /** Decision ids that arrived live this session — rendered with a subtle highlight. */
  readonly liveIds?: ReadonlySet<number>;
}

/** The global War Chronicle — a dense table of every recorded decision. */
export function ChronicleTable({ decisions, liveIds }: ChronicleTableProps) {
  if (decisions.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface/60 p-10 text-center text-muted">
        No decisions recorded yet. When Spartans act, their proofs appear here.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface/60">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wider text-muted">
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Spartan</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Confidence</th>
              <th className="px-4 py-3 font-medium">Risk</th>
              <th className="px-4 py-3 font-medium">Output Hash</th>
              <th className="px-4 py-3 font-medium">Proof</th>
              <th className="px-4 py-3 font-medium">When</th>
            </tr>
          </thead>
          <tbody>
            {decisions.map((decision) => {
              const riskTone =
                decision.riskScore >= 60 ? "crimson" : decision.riskScore >= 30 ? "gold" : "success";
              const link = decision.txHash ? txUrl(decision.txHash) : "";
              const isLive = liveIds?.has(decision.decisionId) ?? false;
              return (
                <tr
                  key={decision.decisionId}
                  className={cn(
                    "border-b border-border/60 transition-colors last:border-0 hover:bg-surface-2/50",
                    isLive && "animate-highlight-fade",
                  )}
                >
                  <td className="px-4 py-3 font-mono text-muted">{decision.decisionId}</td>
                  <td className="px-4 py-3">
                    {decision.agentName ? (
                      <Link href={`/agents/${decision.agentId}`} className="text-gold hover:underline">
                        {decision.agentName}
                      </Link>
                    ) : (
                      <span className="text-muted">#{decision.agentId}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone="info">{decision.actionType}</Badge>
                  </td>
                  <td className="px-4 py-3 text-gold">{pct(decision.confidence)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={riskTone}>{pct(decision.riskScore)}</Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-foreground/70">
                    {shortHash(decision.outputHash, 5)}
                  </td>
                  <td className="px-4 py-3">
                    {link ? (
                      <a href={link} target="_blank" rel="noreferrer" className="text-gold hover:underline">
                        view ↗
                      </a>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">{timeAgo(decision.timestamp)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
