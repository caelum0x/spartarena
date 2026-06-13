/**
 * Deterministic URL slug helpers.
 *
 * Slugs are derived from a human name, lowercased and hyphenated, with a short
 * disambiguating suffix appended by callers when collisions occur.
 */

/** Convert an arbitrary string into a URL-safe slug. */
export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/** Append a short random suffix to keep a slug unique. */
export function withSuffix(base: string): string {
  const suffix = Math.random().toString(36).slice(2, 8);
  const root = base.length > 0 ? base : "spartan";
  return `${root}-${suffix}`;
}
