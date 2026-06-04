import crypto  from "crypto";
import { db }  from "../db";

// ─── Event types ──────────────────────────────────────────────────────────────

export type VaelEventType =
  | "agent.registered"
  | "agent.deactivated"
  | "agent.reactivated"
  | "activity.logged"
  | "passport.issued"
  | "reputation.updated"
  | "stake.placed"
  | "stake.withdrawn"
  | "task.posted"
  | "task.assigned"
  | "task.completed"
  | "task.settled"
  | "task.disputed"
  | "condition.triggered"
  | "memory.set";

export interface VaelWebhookEvent {
  id:        string;
  type:      VaelEventType;
  timestamp: number;
  agentId?:  string;
  data:      Record<string, unknown>;
}

const MAX_RETRIES   = 3;
const RETRY_DELAYS  = [5_000, 30_000, 300_000]; // 5s, 30s, 5min
const TIMEOUT_MS    = 10_000;

// ─── Register a webhook ───────────────────────────────────────────────────────

export async function registerWebhook(params: {
  ownerWallet: string;
  url:         string;
  events:      VaelEventType[];
}) {
  const secret = crypto.randomBytes(32).toString("hex");

  const webhook = await db.webhook.create({
    data: {
      ownerWallet: params.ownerWallet.toLowerCase(),
      url:         params.url,
      secret,
      events:      params.events,
      active:      true,
    },
    select: { id: true, url: true, events: true, createdAt: true },
  });

  return { ...webhook, secret }; // secret shown once
}

// ─── Dispatch event to all matching webhooks ──────────────────────────────────

export async function dispatchEvent(event: VaelWebhookEvent): Promise<void> {
  const hooks = await db.webhook.findMany({
    where: {
      active: true,
      events: { hasSome: [event.type, "*"] },
    },
  });

  await Promise.allSettled(hooks.map(hook => deliverToHook(hook, event)));
}

// ─── Deliver to a single webhook ─────────────────────────────────────────────

async function deliverToHook(
  hook:  { id: string; url: string; secret: string },
  event: VaelWebhookEvent,
  attempt = 1
): Promise<void> {
  const body      = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = signPayload(body, timestamp, hook.secret);

  let statusCode: number | undefined;
  let success = false;

  try {
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(hook.url, {
      method:  "POST",
      headers: {
        "Content-Type":          "application/json",
        "X-Vael-Event":          event.type,
        "X-Vael-Signature":      signature,
        "X-Vael-Timestamp":      timestamp,
        "X-Vael-Delivery":       event.id,
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    statusCode = res.status;
    success    = res.ok;
  } catch {
    statusCode = undefined;
    success    = false;
  }

  // Record delivery
  await db.webhookDelivery.create({
    data: {
      webhookId:   hook.id,
      event:       event.type,
      payload:     body,
      statusCode,
      success,
      attempts:    attempt,
      deliveredAt: new Date(),
    },
  });

  if (success) {
    await db.webhook.update({
      where: { id: hook.id },
      data:  { lastFiredAt: new Date(), failureCount: 0 },
    });
    return;
  }

  // Increment failure count — disable after 10 consecutive failures
  const updated = await db.webhook.update({
    where: { id: hook.id },
    data:  { failureCount: { increment: 1 } },
  });

  if (updated.failureCount >= 10) {
    await db.webhook.update({
      where: { id: hook.id },
      data:  { active: false },
    });
    console.warn(`[webhook] Disabled ${hook.id} after 10 failures`);
    return;
  }

  // Retry with backoff
  if (attempt < MAX_RETRIES) {
    const delay = RETRY_DELAYS[attempt - 1] ?? 300_000;
    setTimeout(
      () => deliverToHook(hook, event, attempt + 1),
      delay
    );
  }
}

// ─── HMAC signature ───────────────────────────────────────────────────────────

export function signPayload(body: string, timestamp: string, secret: string): string {
  const msg = `${timestamp}.${body}`;
  return "sha256=" + crypto.createHmac("sha256", secret).update(msg).digest("hex");
}

export function verifySignature(
  body:      string,
  timestamp: string,
  signature: string,
  secret:    string
): boolean {
  const expected = signPayload(body, timestamp, secret);
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

// ─── Get webhooks for owner ───────────────────────────────────────────────────

export async function getWebhooks(ownerWallet: string) {
  return db.webhook.findMany({
    where:   { ownerWallet: ownerWallet.toLowerCase() },
    select:  {
      id: true, url: true, events: true,
      active: true, createdAt: true, lastFiredAt: true, failureCount: true,
      _count: { select: { deliveries: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteWebhook(id: string, ownerWallet: string) {
  return db.webhook.deleteMany({
    where: { id, ownerWallet: ownerWallet.toLowerCase() },
  });
}

export async function getDeliveries(webhookId: string, limit = 20) {
  return db.webhookDelivery.findMany({
    where:   { webhookId },
    orderBy: { deliveredAt: "desc" },
    take:    limit,
  });
}

// ─── All supported event types ────────────────────────────────────────────────

export const ALL_EVENT_TYPES: VaelEventType[] = [
  "agent.registered", "agent.deactivated", "agent.reactivated",
  "activity.logged", "passport.issued",
  "reputation.updated", "stake.placed", "stake.withdrawn",
  "task.posted", "task.assigned", "task.completed", "task.settled", "task.disputed",
  "condition.triggered", "memory.set",
];
