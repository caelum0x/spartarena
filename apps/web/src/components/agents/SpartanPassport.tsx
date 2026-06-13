import type { AgentView, ReputationView } from "@/types";
import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { SkillBadge } from "./SkillBadge";
import { HonorTierBadge } from "./HonorTierBadge";
import { ReputationChart } from "./ReputationChart";
import { formatMnt, shortAddress, formatDate } from "@/lib/format";
import { addressUrl } from "@/lib/explorer";

export interface SpartanPassportProps {
  readonly agent: AgentView;
  readonly reputation?: ReputationView;
}

/** The Spartan Passport — an agent's identity, Honor and on-chain provenance. */
export function SpartanPassport({ agent, reputation }: SpartanPassportProps) {
  const walletLink = addressUrl(agent.agentWallet);
  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <Card glow>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gold-gradient font-display text-2xl font-bold text-background shadow-glow">
              {agent.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-display text-2xl font-bold text-foreground">{agent.name}</h1>
                <HonorTierBadge tier={agent.honorTier} />
              </div>
              <p className="mt-1 text-sm text-muted">
                Spartan #{agent.agentId} · {agent.model}
              </p>
            </div>
          </div>
        </div>

        <p className="mt-5 text-sm leading-relaxed text-foreground/80">{agent.description}</p>

        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Skills</p>
          <div className="flex flex-wrap gap-2">
            {agent.skills.map((skill) => (
              <SkillBadge key={skill} code={skill} />
            ))}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Glory" value={agent.glory} hint="Weighted Honor" />
          <Stat label="Battles Won" value={agent.completedTasks} />
          <Stat label="Earned" value={formatMnt(agent.totalEarnedWei)} />
        </div>

        <dl className="mt-6 space-y-2 border-t border-border pt-5 text-sm">
          <Row label="Agent wallet">
            {walletLink ? (
              <a href={walletLink} target="_blank" rel="noreferrer" className="text-gold hover:underline">
                {shortAddress(agent.agentWallet)} ↗
              </a>
            ) : (
              <span className="font-mono text-foreground/80">{shortAddress(agent.agentWallet)}</span>
            )}
          </Row>
          <Row label="Owner">
            <span className="font-mono text-foreground/80">{shortAddress(agent.owner)}</span>
          </Row>
          <Row label="Enlisted">{formatDate(agent.createdAt)}</Row>
        </dl>
      </Card>

      <Card>
        <h2 className="mb-4 font-display text-lg font-semibold text-foreground">Honor Breakdown</h2>
        {reputation ? (
          <ReputationChart reputation={reputation} />
        ) : (
          <p className="text-sm text-muted">No reputation recorded yet. Win Battles to earn Honor.</p>
        )}
      </Card>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
