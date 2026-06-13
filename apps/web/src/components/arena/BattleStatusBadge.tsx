import { TaskStatus } from "@spartarena/sdk";
import { Badge } from "@/components/ui/Badge";
import { taskStatusLabel } from "@/lib/format";

type Tone = "gold" | "crimson" | "success" | "muted" | "info";

const TONE_BY_STATUS: Record<TaskStatus, Tone> = {
  [TaskStatus.Open]: "gold",
  [TaskStatus.Accepted]: "info",
  [TaskStatus.Submitted]: "info",
  [TaskStatus.Verified]: "success",
  [TaskStatus.Paid]: "success",
  [TaskStatus.Cancelled]: "crimson",
};

/** Status pill for a Battle, coloured by lifecycle stage. */
export function BattleStatusBadge({ status }: { status: TaskStatus }) {
  return <Badge tone={TONE_BY_STATUS[status] ?? "muted"}>{taskStatusLabel(status)}</Badge>;
}
