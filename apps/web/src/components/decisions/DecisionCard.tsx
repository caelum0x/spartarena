import Link from "next/link";
import type { DecisionView } from "@/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DecisionProof } from "./DecisionProof";
import { AuditFindings } from "./AuditFindings";
import { pct, timeAgo } from "@/lib/format";

/** Full decision record card with scores, explanation and proof hashes. */
export function DecisionCard({ decision }: { decision: DecisionView }) {
  const riskTone = decision.riskScore >= 60 ? "crimson" : decision.riskScore >= 30 ? "gold" : "success";
  const auditFindings =
    decision.actionType === "CONTRACT_AUDIT" ? decision.findings : undefined;

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Badge tone="info">{decision.actionType}</Badge>
            {decision.agentName && (
              <Link href={`/agents/${decision.agentId}`} className="text-sm font-medium text-gold hover:underline">
                {decision.agentName}
              </Link>
            )}
          </div>
          {decision.summary && (
            <h3 className="mt-2 font-display text-base font-semibold text-foreground">
              {decision.summary}
            </h3>
          )}
        </div>
        <span className="shrink-0 text-xs text-muted">{timeAgo(decision.timestamp)}</span>
      </div>

      {decision.humanExplanation && (
        <p className="mt-3 text-sm leading-relaxed text-foreground/80">{decision.humanExplanation}</p>
      )}

      {auditFindings && auditFindings.length > 0 && (
        <AuditFindings findings={auditFindings} target={decision.target} />
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge tone="gold">Confidence {pct(decision.confidence)}</Badge>
        <Badge tone={riskTone}>Risk {pct(decision.riskScore)}</Badge>
        <Link href={`/arena/${decision.taskId}`} className="inline-flex">
          <Badge tone="muted">Battle #{decision.taskId}</Badge>
        </Link>
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
          Cryptographic Proof
        </p>
        <DecisionProof decision={decision} />
      </div>
    </Card>
  );
}
