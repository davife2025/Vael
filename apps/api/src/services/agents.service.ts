import { db } from "../db";
import { graphClient, GET_AGENT, GET_AGENTS, GET_REGISTRY_STATS, GET_LIVE_FEED } from "../graphClient";
import type { z } from "zod";
import type { agentFilterSchema } from "../schemas";

type AgentFilter = z.infer<typeof agentFilterSchema>;

// ── Fetch single agent ────────────────────────────────────────────────────────

export async function getAgentById(agentId: string) {
  // 1. Try subgraph (freshest on-chain data)
  try {
    const data = await graphClient.request<{ agent: any }>(GET_AGENT, { id: agentId });
    if (!data.agent) return null;

    // 2. Merge with Postgres enrichment (name, description, capabilities etc.)
    const enriched = await db.agent.findUnique({ where: { id: agentId } });

    return mergeAgentData(data.agent, enriched);
  } catch {
    // Fallback: Postgres only (subgraph may be catching up)
    const agent = await db.agent.findUnique({ where: { id: agentId } });
    return agent ?? null;
  }
}

// ── List agents ───────────────────────────────────────────────────────────────

export async function listAgents(filter: AgentFilter) {
  const { page, limit, owner, agentType, active, minReputation, orderBy, orderDir } = filter;
  const skip  = (page - 1) * limit;

  // Build subgraph where clause
  const where: Record<string, unknown> = {};
  if (owner)     where.owner     = owner.toLowerCase();
  if (agentType) where.agentType = agentType;
  if (active !== undefined) where.active = active;

  try {
    const data = await graphClient.request<{ agents: any[] }>(GET_AGENTS, {
      first:          limit,
      skip,
      where,
      orderBy:        orderBy === "reputationScore" ? "passport__reputationScore" : orderBy,
      orderDirection: orderDir,
    });

    // Enrich with Postgres data
    const ids      = data.agents.map((a: any) => a.id);
    const enriched = await db.agent.findMany({ where: { id: { in: ids } } });
    const enrichMap = Object.fromEntries(enriched.map(e => [e.id, e]));

    let agents = data.agents.map((a: any) => mergeAgentData(a, enrichMap[a.id]));

    // Apply minReputation filter (post-fetch since subgraph nested filter is limited)
    if (minReputation !== undefined) {
      agents = agents.filter((a: any) =>
        (a.passport?.reputationScore ?? 0) >= minReputation
      );
    }

    return {
      data:    agents,
      total:   agents.length,
      page,
      limit,
      hasMore: data.agents.length === limit,
    };
  } catch {
    // Fallback: Postgres only
    const where: any = {};
    if (owner)     where.owner     = owner;
    if (agentType) where.agentType = agentType;
    if (active !== undefined) where.active = active;
    if (minReputation !== undefined) where.reputationScore = { gte: minReputation };

    const [agents, total] = await Promise.all([
      db.agent.findMany({ where, skip, take: limit }),
      db.agent.count({ where }),
    ]);

    return { data: agents, total, page, limit, hasMore: skip + limit < total };
  }
}

// ── Registry stats ────────────────────────────────────────────────────────────

export async function getRegistryStats() {
  try {
    const data = await graphClient.request<{ registryStats: any }>(GET_REGISTRY_STATS);
    return data.registryStats;
  } catch {
    const stats = await db.globalStats.findUnique({ where: { id: "global" } });
    return stats ?? { totalAgents: 0, totalActivities: 0, totalPassports: 0 };
  }
}

// ── Live feed ─────────────────────────────────────────────────────────────────

export async function getLiveFeed(limit: number = 10) {
  try {
    const data = await graphClient.request<{ agents: any[]; activities: any[] }>(
      GET_LIVE_FEED, { first: limit }
    );
    return data;
  } catch {
    const [agents, activities] = await Promise.all([
      db.agent.findMany({ orderBy: { createdAt: "desc" }, take: limit }),
      db.activity.findMany({ orderBy: { timestamp: "desc" }, take: limit }),
    ]);
    return { agents, activities };
  }
}

// ── Sync agent from chain to Postgres (called via webhook from subgraph) ──────

export async function syncAgentToDb(chainAgent: any) {
  await db.agent.upsert({
    where:  { id: chainAgent.id },
    update: {
      active:          chainAgent.active,
      reputationScore: Number(chainAgent.passport?.reputationScore ?? 0),
      totalActivities: Number(chainAgent.totalActivities ?? 0),
      lastActivityAt:  chainAgent.lastActivityAt
        ? new Date(Number(chainAgent.lastActivityAt) * 1000)
        : null,
    },
    create: {
      id:              chainAgent.id,
      owner:           chainAgent.owner,
      agentType:       chainAgent.agentType,
      createdAt:       new Date(Number(chainAgent.createdAt) * 1000),
      active:          chainAgent.active ?? true,
      reputationScore: 0,
      totalActivities: 0,
    },
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mergeAgentData(chainData: any, dbData: any) {
  return {
    ...chainData,
    name:         dbData?.name         ?? null,
    description:  dbData?.description  ?? null,
    imageUrl:     dbData?.imageUrl     ?? null,
    capabilities: dbData?.capabilities ?? [],
    model:        dbData?.model        ?? null,
    framework:    dbData?.framework    ?? null,
    verified:     dbData?.verified     ?? false,
  };
}
