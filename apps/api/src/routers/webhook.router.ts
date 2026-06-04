import { Router, type Response } from "express";
import { z } from "zod";
import { addressSchema } from "../schemas";
import {
  registerWebhook,
  getWebhooks,
  deleteWebhook,
  getDeliveries,
  ALL_EVENT_TYPES,
  type VaelEventType,
} from "../services/webhook.service";
import {
  getNotifications,
  markRead,
  getUnreadCount,
} from "../services/notifications.service";
import { requireApiKey, type AuthRequest } from "../middleware/auth.middleware";
import { getConnectionCount } from "../ws/ws.server";

export const webhookRouter = Router();

// ─── Webhook CRUD ─────────────────────────────────────────────────────────────

/**
 * GET /v1/webhooks/events
 * List all supported event types.
 */
webhookRouter.get("/events", (_req, res: Response) => {
  res.json({ success: true, data: ALL_EVENT_TYPES });
});

/**
 * GET /v1/webhooks/ws/stats
 * WebSocket connection stats.
 */
webhookRouter.get("/ws/stats", (_req, res: Response) => {
  res.json({
    success: true,
    data: {
      connectedClients: getConnectionCount(),
      wsEndpoint:       "ws://api.vael.xyz/ws",
    },
  });
});

/**
 * POST /v1/webhooks
 * Register a new webhook. Returns the secret once — store it safely.
 */
webhookRouter.post("/", requireApiKey, async (req: AuthRequest, res: Response) => {
  const schema = z.object({
    url:    z.string().url("Must be a valid HTTPS URL").startsWith("https://", "Webhooks must use HTTPS"),
    events: z.array(z.string()).min(1, "At least one event type required"),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }

  // Validate event types
  const invalid = parsed.data.events.filter(
    e => e !== "*" && !ALL_EVENT_TYPES.includes(e as VaelEventType)
  );
  if (invalid.length > 0) {
    return res.status(400).json({
      error: `Invalid event types: ${invalid.join(", ")}`,
      valid: ALL_EVENT_TYPES,
    });
  }

  try {
    const webhook = await registerWebhook({
      ownerWallet: req.apiKey!.ownerWallet,
      url:         parsed.data.url,
      events:      parsed.data.events as VaelEventType[],
    });

    return res.status(201).json({
      success: true,
      data:    webhook,
      warning: "Store the secret safely — it will not be shown again. Use it to verify X-Vael-Signature headers.",
    });
  } catch {
    return res.status(500).json({ error: "Failed to register webhook" });
  }
});

/**
 * GET /v1/webhooks
 * List all webhooks for the authenticated API key owner.
 */
webhookRouter.get("/", requireApiKey, async (req: AuthRequest, res: Response) => {
  try {
    const hooks = await getWebhooks(req.apiKey!.ownerWallet);
    return res.json({ success: true, data: hooks });
  } catch {
    return res.status(500).json({ error: "Failed to fetch webhooks" });
  }
});

/**
 * GET /v1/webhooks/:id/deliveries
 * Get recent delivery attempts for a webhook.
 */
webhookRouter.get("/:id/deliveries", requireApiKey, async (req: AuthRequest, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  try {
    const deliveries = await getDeliveries(req.params.id, limit);
    return res.json({ success: true, data: deliveries });
  } catch {
    return res.status(500).json({ error: "Failed to fetch deliveries" });
  }
});

/**
 * DELETE /v1/webhooks/:id
 * Delete a webhook.
 */
webhookRouter.delete("/:id", requireApiKey, async (req: AuthRequest, res: Response) => {
  try {
    const result = await deleteWebhook(req.params.id, req.apiKey!.ownerWallet);
    if (result.count === 0) {
      return res.status(404).json({ error: "Webhook not found or not owned by you" });
    }
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: "Failed to delete webhook" });
  }
});

// ─── Notifications ────────────────────────────────────────────────────────────

/**
 * GET /v1/webhooks/notifications
 * Get in-app notifications for the authenticated wallet.
 */
webhookRouter.get("/notifications", requireApiKey, async (req: AuthRequest, res: Response) => {
  const schema = z.object({
    page:       z.coerce.number().int().min(1).default(1),
    limit:      z.coerce.number().int().min(1).max(50).default(20),
    unreadOnly: z.enum(["true", "false"]).transform(v => v === "true").default("false"),
  });

  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "Invalid query params" });

  try {
    const data = await getNotifications(req.apiKey!.ownerWallet, parsed.data);
    return res.json({ success: true, ...data });
  } catch {
    return res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

/**
 * GET /v1/webhooks/notifications/unread
 * Get unread notification count for the authenticated wallet.
 */
webhookRouter.get("/notifications/unread", requireApiKey, async (req: AuthRequest, res: Response) => {
  try {
    const count = await getUnreadCount(req.apiKey!.ownerWallet);
    return res.json({ success: true, data: { count } });
  } catch {
    return res.status(500).json({ error: "Failed to fetch unread count" });
  }
});

/**
 * POST /v1/webhooks/notifications/read
 * Mark notifications as read. Body: { ids: string[] } or empty = mark all.
 */
webhookRouter.post("/notifications/read", requireApiKey, async (req: AuthRequest, res: Response) => {
  const ids = req.body?.ids as string[] | undefined;
  try {
    const result = await markRead(req.apiKey!.ownerWallet, ids);
    return res.json({ success: true, data: { updated: result.count } });
  } catch {
    return res.status(500).json({ error: "Failed to mark as read" });
  }
});
