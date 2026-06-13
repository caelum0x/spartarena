import type { AuditFindingView } from "@/types";
import { Badge, type BadgeProps } from "@/components/ui/Badge";

/** Maps an audit severity to a Badge tone (higher severity → hotter colour). */
const SEVERITY_TONE: Record<AuditFindingView["severity"], NonNullable<BadgeProps["tone"]>> = {
  critical: "crimson",
  high: "crimson",
  medium: "gold",
  low: "info",
  info: "muted",
};

/** Display order: most severe first. */
const SEVERITY_RANK: Record<AuditFindingView["severity"], number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  info: 0,
};

/**
 * Renders CONTRACT_AUDIT findings with severity badges. Defensive: returns null
 * when there are no findings so callers can drop it in unconditionally.
 */
export function AuditFindings({
  findings,
  target,
}: {
  findings: readonly AuditFindingView[];
  target?: string;
}) {
  if (findings.length === 0) return null;

  const ordered = [...findings].sort(
    (a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity],
  );

  return (
    <div className="mt-5 border-t border-border pt-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
          Audit Findings
        </p>
        {target && (
          <code className="truncate font-mono text-xs text-muted" title={target}>
            {target}
          </code>
        )}
      </div>
      <ul className="space-y-3">
        {ordered.map((finding, index) => (
          <li
            key={`${finding.severity}-${finding.title}-${index}`}
            className="rounded-lg border border-border bg-surface-2/60 p-3"
          >
            <div className="flex items-center gap-2">
              <Badge tone={SEVERITY_TONE[finding.severity]} className="uppercase">
                {finding.severity}
              </Badge>
              <span className="text-sm font-semibold text-foreground">{finding.title}</span>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-foreground/75">{finding.detail}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
