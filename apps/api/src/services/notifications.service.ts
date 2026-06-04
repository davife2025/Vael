import { db } from "../db";

// ─── Notification types ───────────────────────────────────────────────────────

export type NotificationType =
  | "activity"
  | "reputation"
  | "staked"
  | "unstaked"
  | "endorsed"
  | "task_assigned"
  | "task_completed"
  | "task_settled"
  | "task_disputed"
  | "condition_triggered"
  | "passport_issued"
  | "passport_verified"
  | "agent_registered";

// ─── Create notification ──────────────────────────────────────────────────────

export async function createNotification(params: {
  ownerWallet: string;
  agentId?:    string;
  type:        NotificationType;
  title:       string;
  body:        string;
  metadata?:   Record<string, unknown>;
}) {
  return db.notification.create({
    data: {
      ownerWallet: params.ownerWallet.toLowerCase(),
      agentId:     params.agentId,
      type:        params.type,
      title:       params.title,
      body:        params.body,
      metadata:    params.metadata ? JSON.stringify(params.metadata) : undefined,
    },
  });
}

// ─── Bulk create (from chain event) ──────────────────────────────────────────

export async function notifyAgentOwner(
  agentId:    string,
  type:       NotificationType,
  title:      string,
  body:       string,
  metadata?:  Record<string, unknown>
) {
  // Look up agent owner from DB
  const agent = await db.agent.findUnique({
    where:  { id: agentId },
    select: { owner: true },
  });
  if (!agent) return null;

  return createNotification({
    ownerWallet: agent.owner,
    agentId,
    type,
    title,
    body,
    metadata,
  });
}

// ─── Get notifications for wallet ─────────────────────────────────────────────

export async function getNotifications(
  ownerWallet: string,
  params: { limit?: number; page?: number; unreadOnly?: boolean } = {}
) {
  const { limit = 20, page = 1, unreadOnly = false } = params;
  const skip = (page - 1) * limit;

  const where: any = { ownerWallet: ownerWallet.toLowerCase() };
  if (unreadOnly) where.read = false;

  const [notifications, total, unreadCount] = await Promise.all([
    db.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take:    limit,
    }),
    db.notification.count({ where }),
    db.notification.count({
      where: { ownerWallet: ownerWallet.toLowerCase(), read: false },
    }),
  ]);

  return {
    notifications: notifications.map(n => ({
      ...n,
      metadata: n.metadata ? JSON.parse(n.metadata) : null,
    })),
    total,
    unreadCount,
    page,
    limit,
    hasMore: skip + limit < total,
  };
}

// ─── Mark read ────────────────────────────────────────────────────────────────

export async function markRead(
  ownerWallet: string,
  notificationIds?: string[]   // undefined = mark all
) {
  const where: any = { ownerWallet: ownerWallet.toLowerCase() };
  if (notificationIds?.length) where.id = { in: notificationIds };

  return db.notification.updateMany({
    where,
    data: { read: true },
  });
}

// ─── Unread count ─────────────────────────────────────────────────────────────

export async function getUnreadCount(ownerWallet: string): Promise<number> {
  return db.notification.count({
    where: { ownerWallet: ownerWallet.toLowerCase(), read: false },
  });
}

// ─── Delete old notifications (cleanup) ──────────────────────────────────────

export async function pruneNotifications(olderThanDays = 30) {
  const cutoff = new Date(Date.now() - olderThanDays * 86_400_000);
  return db.notification.deleteMany({
    where: { createdAt: { lt: cutoff }, read: true },
  });
}
