import { telegramService } from "./telegram.service.js";
import { discordService } from "./discord.service.js";
import { notificationService } from "./notifications.service.js";

/**
 * Fan-out notifier. Sends an alert to every configured channel; channels that
 * are unconfigured silently no-op. Returns which channels acknowledged delivery.
 *
 * Thin compatibility wrapper around {@link notificationService.notifyAll} for
 * callers that already hold a fully-formatted message.
 */
export async function notifyAll(
  message: string,
): Promise<{ telegram: boolean; discord: boolean }> {
  return notificationService.notifyAll(message);
}

export { telegramService, discordService, notificationService };
export type {
  NotificationStatus,
  DeliveryResult,
  BattleCompletedEvent,
  BattleVerifiedEvent,
  SlashEvent,
} from "./notifications.service.js";
