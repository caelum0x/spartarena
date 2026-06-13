import { env } from "../../env.js";
import { childLogger } from "../../lib/logger.js";

/**
 * Telegram alert publisher.
 *
 * No-ops gracefully when `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` are unset, so
 * the API never fails because notifications aren't configured. Network errors
 * are logged and swallowed — an alert failure must never break a chain write.
 */
const log = childLogger("notifications.telegram");

/** Hard cap on a single outbound notification request. */
const SEND_TIMEOUT_MS = 8_000;

/**
 * Escape text for Telegram MarkdownV2. Every reserved character must be
 * backslash-escaped in literal/dynamic text, otherwise Telegram rejects the
 * message with a 400 "can't parse entities" — silently dropping alerts that
 * contain user/agent-controlled strings (e.g. an agent name with `_`). Apply to
 * dynamic values; static markup (`*…*`, `[…](…)`) is added around the result.
 */
export function escapeMarkdownV2(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, (ch) => `\\${ch}`);
}

/** Escape a URL for use inside a MarkdownV2 `(…)` link target. */
export function escapeMarkdownV2Url(url: string): string {
  return url.replace(/[)\\]/g, (ch) => `\\${ch}`);
}

export interface TelegramService {
  readonly enabled: boolean;
  send(message: string): Promise<boolean>;
}

export const telegramService: TelegramService = {
  enabled: env.TELEGRAM_BOT_TOKEN !== undefined && env.TELEGRAM_CHAT_ID !== undefined,

  async send(message: string): Promise<boolean> {
    if (env.TELEGRAM_BOT_TOKEN === undefined || env.TELEGRAM_CHAT_ID === undefined) {
      log.debug("Telegram not configured; skipping send (no-op)");
      return false;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
    try {
      const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chat_id: env.TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: "MarkdownV2",
          disable_web_page_preview: true,
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        log.warn({ status: res.status }, "Telegram sendMessage non-OK");
        return false;
      }
      return true;
    } catch (err) {
      // Never throw into the caller — an alert failure must not break the flow.
      log.warn({ err }, "Telegram send failed");
      return false;
    } finally {
      clearTimeout(timer);
    }
  },
};
