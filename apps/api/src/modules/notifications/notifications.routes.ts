import type { FastifyInstance } from "fastify";
import { ok } from "../../lib/errors.js";
import { notificationService } from "./notifications.service.js";

/**
 * Notification status routes.
 *
 * `GET /notifications/status` reports which delivery channels are configured as
 * booleans only. It deliberately never returns the bot token, chat id, or
 * webhook URL so secrets cannot leak through this endpoint.
 */
export async function notificationsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/notifications/status", async () => ok(notificationService.status()));
}
