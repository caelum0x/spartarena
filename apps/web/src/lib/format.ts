/**
 * Web-side formatting helpers. Thin wrappers over @spartarena/shared formatters
 * plus a few UI-only conveniences. Pure & render-safe.
 */
import { formatMnt as sharedFormatMnt, shortAddress, timeAgo } from "@spartarena/shared";
import { TaskStatus } from "@spartarena/sdk";

export { shortAddress, timeAgo };

/** Format a wei string/bigint as MNT for display. */
export function formatMnt(wei: string | bigint, withSymbol = true): string {
  const value = typeof wei === "bigint" ? wei : safeBigInt(wei);
  return sharedFormatMnt(value, { withSymbol });
}

/** Parse a base-10 string into a bigint, defaulting to 0n on bad input. */
export function safeBigInt(value: string): bigint {
  return /^\d+$/.test(value) ? BigInt(value) : 0n;
}

/** Human label for a Battle status. */
export function taskStatusLabel(status: TaskStatus): string {
  switch (status) {
    case TaskStatus.Open:
      return "Open";
    case TaskStatus.Accepted:
      return "Accepted";
    case TaskStatus.Submitted:
      return "Submitted";
    case TaskStatus.Verified:
      return "Verified";
    case TaskStatus.Paid:
      return "Paid";
    case TaskStatus.Cancelled:
      return "Cancelled";
    default:
      return "Unknown";
  }
}

/** Format a unix-seconds timestamp as an absolute date. */
export function formatDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Format a unix-seconds deadline as a relative countdown ("in 3 days"). */
export function formatDeadline(unixSeconds: number): string {
  return timeAgo(unixSeconds);
}

/** Clamp a number to a percentage string with no decimals. */
export function pct(value: number): string {
  return `${Math.round(Math.min(100, Math.max(0, value)))}%`;
}

/** A percentage string with one decimal, not clamped (e.g. APR / utilization). */
export function pct1(value: number): string {
  return `${value.toFixed(1)}%`;
}

/** Compact USD formatter ($4.8M, $318.2K, $42). */
export function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}
