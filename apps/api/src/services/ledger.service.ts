import { db } from "../db";
import { graphClient, GET_ACTIVITIES } from "../graphClient";
import type { z } from "zod";
import type { activityFilterSchema } from "../schemas";

type ActivityFilter = z.infer<typeof activityFilterSchema>;

export async function getLedger(agentId: string, filter: ActivityFilter) {
  const { page, limit, action, fromTimestamp, toTimestamp, orderDir } = filter;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { agent: agentId };
  if (action)        where.action          = action;
  if (fromTimestamp) where.timestamp_gte   = fromTimestamp.toString();
  if (toTimestamp)   where.timestamp_lte   = toTimestamp.toString();

  try {
    const data = await graphClient.request<{ activities: any[] }>(GET_ACTIVITIES, {
      agentId,
      first:          limit,
      skip,
      orderBy:        "timestamp",
      orderDirection: orderDir,
    });

    return {
      data:    data.activities,
      page,
      limit,
      hasMore: data.activities.length === limit,
    };
  } catch {
    // Fallback: Postgres
    const dbWhere: any = { agentId };
    if (action)        dbWhere.action    = action;
    if (fromTimestamp) dbWhere.timestamp = { gte: new Date(fromTimestamp * 1000) };
    if (toTimestamp)   dbWhere.timestamp = { ...dbWhere.timestamp, lte: new Date(toTimestamp * 1000) };

    const activities = await db.activity.findMany({
      where:   dbWhere,
      skip,
      take:    limit,
      orderBy: { timestamp: orderDir },
    });

    return { data: activities, page, limit, hasMore: activities.length === limit };
  }
}

export async function getActivityEntry(agentId: string, entryId: string) {
  try {
    const id   = `${agentId}-${entryId}`;
    const data = await db.activity.findUnique({ where: { id } });
    return data ?? null;
  } catch {
    return null;
  }
}

export async function syncActivityToDb(activity: any) {
  await db.activity.upsert({
    where:  { id: activity.id },
    update: {},
    create: {
      id:            activity.id,
      agentId:       activity.agent?.id ?? activity.agentId,
      entryId:       BigInt(activity.entryId),
      action:        activity.action,
      target:        activity.target ?? null,
      timestamp:     new Date(Number(activity.timestamp) * 1000),
      blockNumber:   BigInt(activity.blockNumber),
      txHash:        activity.transactionHash,
      conditionHash: activity.conditionHash,
    },
  });
}
