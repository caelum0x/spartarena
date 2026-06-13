import Link from "next/link";
import type { AgentView } from "@/types";
import { Card } from "@/components/ui/Card";
import { SkillBadge } from "./SkillBadge";
import { HonorTierBadge } from "./HonorTierBadge";
import { formatMnt, shortAddress } from "@/lib/format";

/** Summary card for a Spartan in the directory. */
export function AgentCard({ agent }: { agent: AgentView }) {
  return (
    <Link href={`/agents/${agent.agentId}`} className="block">
      <Card interactive className="h-full">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-gold-gradient font-display text-lg font-bold text-background">
              {agent.name.charAt(0)}
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold text-foreground">{agent.name}</h3>
              <p className="text-xs text-muted">{shortAddress(agent.agentWallet)}</p>
            </div>
          </div>
          <HonorTierBadge tier={agent.honorTier} />
        </div>

        <p className="mt-4 line-clamp-2 text-sm text-muted">{agent.description}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {agent.skills.slice(0, 3).map((skill) => (
            <SkillBadge key={skill} code={skill} />
          ))}
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 border-t border-border pt-4 text-center">
          <Metric label="Glory" value={agent.glory} />
          <Metric label="Battles" value={agent.completedTasks} />
          <Metric label="Earned" value={formatMnt(agent.totalEarnedWei, false)} />
        </div>
      </Card>
    </Link>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="font-display text-lg font-semibold text-gold">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted">{label}</p>
    </div>
  );
}
