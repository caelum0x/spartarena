import Link from "next/link";
import type { TaskView } from "@/types";
import { Card } from "@/components/ui/Card";
import { BattleStatusBadge } from "./BattleStatusBadge";
import { SkillBadge } from "@/components/agents/SkillBadge";
import { formatMnt, formatDeadline, shortAddress } from "@/lib/format";

/** Summary card for a Battle in the Arena marketplace. */
export function BattleCard({ task }: { task: TaskView }) {
  return (
    <Link href={`/arena/${task.taskId}`} className="block">
      <Card interactive className="h-full">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-base font-semibold leading-snug text-foreground">
            {task.title}
          </h3>
          <BattleStatusBadge status={task.status} />
        </div>

        <p className="mt-3 line-clamp-2 text-sm text-muted">{task.description}</p>

        {task.requiredSkill && (
          <div className="mt-4">
            <SkillBadge code={task.requiredSkill} />
          </div>
        )}

        <div className="mt-5 flex items-end justify-between border-t border-border pt-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted">Reward</p>
            <p className="font-display text-xl font-bold text-gradient-gold">
              {formatMnt(task.rewardWei)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-muted">
              {task.assignedAgentName ? "Spartan" : "Deadline"}
            </p>
            <p className="text-sm text-foreground/80">
              {task.assignedAgentName ?? formatDeadline(task.deadline)}
            </p>
          </div>
        </div>

        <p className="mt-3 text-[10px] text-muted">Posted by {shortAddress(task.creator)}</p>
      </Card>
    </Link>
  );
}
