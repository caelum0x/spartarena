"use client";

import { useNotificationStatus } from "@/hooks/useNotificationStatus";

/**
 * Compact "Alerts" indicator showing which backend notification channels are
 * configured (Telegram / Discord). Renders nothing until the soft status read
 * resolves to data, so an unimplemented or unreachable endpoint leaves no trace.
 */
export function NotificationStatus({ className }: { className?: string }) {
  const { data } = useNotificationStatus();

  if (!data) return null;

  const channels: ReadonlyArray<{ label: string; on: boolean }> = [
    { label: "Telegram", on: data.telegram },
    { label: "Discord", on: data.discord },
  ];

  const anyOn = channels.some((c) => c.on);

  return (
    <span
      className={className}
      title={anyOn ? "Alert channels configured on the backend" : "No alert channels configured"}
    >
      <span className="text-muted">Alerts: </span>
      {channels.map((channel, index) => (
        <span key={channel.label}>
          <span className={channel.on ? "text-gold" : "text-muted/60"}>
            {channel.label} {channel.on ? "✓" : "✗"}
          </span>
          {index < channels.length - 1 && <span className="text-muted"> · </span>}
        </span>
      ))}
    </span>
  );
}
