/** Loading placeholder grid used while data fetches. */
export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-52 overflow-hidden rounded-2xl border border-border bg-surface/60"
        >
          <div className="shimmer h-full w-full" />
        </div>
      ))}
    </div>
  );
}
