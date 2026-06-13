import { formatUnits } from "viem";
import { NATIVE_CURRENCY } from "../constants.js";

/**
 * Display formatting helpers. Pure and side-effect free so they are safe to call
 * from React render paths.
 */

export interface FormatMntOptions {
  /** Maximum fraction digits to show. Default 4. */
  readonly maxFractionDigits?: number;
  /** Append the " MNT" symbol. Default true. */
  readonly withSymbol?: boolean;
}

/**
 * Formats a wei amount (bigint or base-10 string) as a human-readable MNT value.
 * Trims trailing zeros and caps fraction digits for compact display.
 */
export function formatMnt(
  wei: bigint | string,
  options: FormatMntOptions = {},
): string {
  const { maxFractionDigits = 4, withSymbol = true } = options;

  const value =
    typeof wei === "bigint" ? wei : BigInt(/^\d+$/.test(wei) ? wei : "0");

  const whole = formatUnits(value, NATIVE_CURRENCY.decimals);
  const num = Number(whole);

  const formatted = Number.isFinite(num)
    ? num.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: maxFractionDigits,
      })
    : whole;

  return withSymbol ? `${formatted} ${NATIVE_CURRENCY.symbol}` : formatted;
}

/**
 * Shortens an EVM address to the conventional `0x1234…abcd` form.
 * Returns the input unchanged if it is too short to abbreviate.
 */
export function shortAddress(address: string, chars = 4): string {
  if (!address.startsWith("0x") || address.length <= 2 + chars * 2) {
    return address;
  }
  const prefix = address.slice(0, 2 + chars);
  const suffix = address.slice(-chars);
  return `${prefix}…${suffix}`;
}

const TIME_DIVISIONS: ReadonlyArray<{
  readonly amount: number;
  readonly unit: Intl.RelativeTimeFormatUnit;
}> = [
  { amount: 60, unit: "second" },
  { amount: 60, unit: "minute" },
  { amount: 24, unit: "hour" },
  { amount: 7, unit: "day" },
  { amount: 4.34524, unit: "week" },
  { amount: 12, unit: "month" },
  { amount: Number.POSITIVE_INFINITY, unit: "year" },
];

/**
 * Returns a relative time string (e.g. "3 minutes ago", "in 2 days").
 *
 * @param input        Date, unix-seconds number, or ms timestamp/Date-string.
 * @param now          Reference time in ms (defaults to Date.now()).
 */
export function timeAgo(
  input: Date | number | string,
  now: number = Date.now(),
): string {
  const ms = toMillis(input);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  let duration = (ms - now) / 1000; // seconds, signed

  for (const division of TIME_DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return formatter.format(Math.round(duration), division.unit);
    }
    duration /= division.amount;
  }

  return formatter.format(Math.round(duration), "year");
}

/** Normalises a date-ish input into a millisecond timestamp. */
function toMillis(input: Date | number | string): number {
  if (input instanceof Date) return input.getTime();
  if (typeof input === "number") {
    // Heuristic: values below ~1e12 are unix seconds, not milliseconds.
    return input < 1e12 ? input * 1000 : input;
  }
  const parsed = Date.parse(input);
  return Number.isNaN(parsed) ? Date.now() : parsed;
}
