import { env } from "../../env.js";
import { childLogger } from "../../lib/logger.js";

/**
 * Discord webhook publisher.
 *
 * No-ops gracefully when `DISCORD_WEBHOOK_URL` is unset. Failures are logged and
 * swallowed so notification problems never break the core execution flow.
 */
const log = childLogger("notifications.discord");

/** Hard cap on a single outbound notification request. */
const SEND_TIMEOUT_MS = 8_000;

/** Discord rejects messages over 2000 characters; clamp defensively. */
const MAX_CONTENT_LENGTH = 2_000;

export interface DiscordService {
  readonly enabled: boolean;
  send(content: string): Promise<boolean>;
}

export const discordService: DiscordService = {
  enabled: env.DISCORD_WEBHOOK_URL !== undefined,

  async send(content: string): Promise<boolean> {
    if (env.DISCORD_WEBHOOK_URL === undefined) {
      log.debug("Discord not configured; skipping send (no-op)");
      return false;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
    try {
      const res = await fetch(env.DISCORD_WEBHOOK_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: content.slice(0, MAX_CONTENT_LENGTH) }),
        signal: controller.signal,
      });
      if (!res.ok) {
        log.warn({ status: res.status }, "Discord webhook non-OK");
        return false;
      }
      return true;
    } catch (err) {
      // Never throw into the caller — an alert failure must not break the flow.
      log.warn({ err }, "Discord send failed");
      return false;
    } finally {
      clearTimeout(timer);
    }
  },
};
