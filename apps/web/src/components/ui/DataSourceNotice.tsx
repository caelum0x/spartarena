import { Badge } from "./Badge";

/** Small inline notice shown when the UI is rendering fallback mock data. */
export function DataSourceNotice({ source }: { source: "api" | "mock" }) {
  if (source === "api") return null;
  return (
    <Badge tone="info" className="ml-2">
      <span className="h-1.5 w-1.5 rounded-full bg-gold" aria-hidden />
      Demo data
    </Badge>
  );
}
