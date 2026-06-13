import { BRAND_COLORS } from "./labels.js";

/**
 * Lifecycle of a Battle (task), mirroring TaskEscrow's on-chain enum.
 *
 * The numeric values MUST match the Solidity enum order exactly:
 *   enum TaskStatus { Open, Accepted, Submitted, Verified, Paid, Cancelled }
 * so that values decoded from chain reads/events map straight onto this enum.
 */
export enum TaskStatus {
  Open = 0,
  Accepted = 1,
  Submitted = 2,
  Verified = 3,
  Paid = 4,
  Cancelled = 5,
}

/** All statuses in on-chain order. */
export const TASK_STATUSES: readonly TaskStatus[] = [
  TaskStatus.Open,
  TaskStatus.Accepted,
  TaskStatus.Submitted,
  TaskStatus.Verified,
  TaskStatus.Paid,
  TaskStatus.Cancelled,
] as const;

/** Human-readable, brand-flavoured label for each status. */
export const TASK_STATUS_LABELS: Readonly<Record<TaskStatus, string>> = {
  [TaskStatus.Open]: "Open for Battle",
  [TaskStatus.Accepted]: "Champion Engaged",
  [TaskStatus.Submitted]: "Awaiting Judgment",
  [TaskStatus.Verified]: "Victory Confirmed",
  [TaskStatus.Paid]: "Spoils Paid",
  [TaskStatus.Cancelled]: "Battle Cancelled",
} as const;

/** Display color (from the brand palette) for each status. */
export const TASK_STATUS_COLORS: Readonly<Record<TaskStatus, string>> = {
  [TaskStatus.Open]: BRAND_COLORS.gold,
  [TaskStatus.Accepted]: BRAND_COLORS.foreground,
  [TaskStatus.Submitted]: BRAND_COLORS.muted,
  [TaskStatus.Verified]: BRAND_COLORS.success,
  [TaskStatus.Paid]: BRAND_COLORS.success,
  [TaskStatus.Cancelled]: BRAND_COLORS.crimson,
} as const;

/** Type guard narrowing a number to a {@link TaskStatus}. */
export function isTaskStatus(value: number): value is TaskStatus {
  return value >= TaskStatus.Open && value <= TaskStatus.Cancelled;
}

/**
 * Converts a raw on-chain status value (number or bigint) into a TaskStatus,
 * falling back to {@link TaskStatus.Open} for unknown values so UI never crashes.
 */
export function toTaskStatus(value: number | bigint): TaskStatus {
  const n = typeof value === "bigint" ? Number(value) : value;
  return isTaskStatus(n) ? n : TaskStatus.Open;
}

/** Returns the brand label for a status value. */
export function taskStatusLabel(value: number | bigint): string {
  return TASK_STATUS_LABELS[toTaskStatus(value)];
}

/** Returns the display color for a status value. */
export function taskStatusColor(value: number | bigint): string {
  return TASK_STATUS_COLORS[toTaskStatus(value)];
}

/** Whether the task has reached a terminal state (no further transitions). */
export function isTerminalStatus(value: number | bigint): boolean {
  const status = toTaskStatus(value);
  return status === TaskStatus.Paid || status === TaskStatus.Cancelled;
}
