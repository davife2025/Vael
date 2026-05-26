import { db } from "../db";
import { graphClient } from "../graphClient";
import { gql } from "graphql-request";

const GET_REPUTATION_FACTORS = gql`
  query GetReputationFactors($agentId: ID!) {
    agent(id: $agentId) {
      id
      totalActivities
      createdAt
      active
      passport {
        reputationScore
        verified
      }
    }
  }
`;

// ── Get full reputation breakdown ─────────────────────────────────────────────

export async function getReputationFactors(agentId: string) {
  try {
    const data = await graphClient.request<{ agent: any }>(
      GET_REPUTATION_FACTORS, { agentId }
    );
    if (!data.agent) return null;

    const agent        = data.agent;
    const totalEntries = Number(agent.totalActivities ?? 0);
    const ageSeconds   = Math.floor(Date.now() / 1000) - Number(agent.createdAt ?? 0);

    // Mirror the on-chain scoring formula for display purposes
    const activityScore  = Math.min(Math.floor((totalEntries  / 1000)  * 300), 300);
    const ageScore       = Math.min(Math.floor((ageSeconds    / 31536000) * 200), 200);
    const reputationScore= Number(agent.passport?.reputationScore ?? 0);

    return {
      agentId,
      total:         reputationScore,
      activityScore,
      ageScore,
      stakeScore:    Math.max(0, reputationScore - activityScore - ageScore),
      communityScore:0, // requires on-chain query
      lastComputed:  new Date().toISOString(),
    };
  } catch {
    const agent = await db.agent.findUnique({ where: { id: agentId } });
    if (!agent) return null;
    return {
      agentId,
      total:          agent.reputationScore,
      activityScore:  0,
      ageScore:       0,
      stakeScore:     0,
      communityScore: 0,
      lastComputed:   new Date().toISOString(),
    };
  }
}

// ── Sync reputation score from chain event to Postgres ────────────────────────

export async function syncReputationScore(agentId: string, score: number) {
  await db.agent.updateMany({
    where:  { id: agentId },
    data:   { reputationScore: score },
  });
}

// ── Get staking info for an agent ─────────────────────────────────────────────

export async function getStakingInfo(agentId: string) {
  try {
    const data = await graphClient.request<{ agent: any }>(gql`
      query GetStakeInfo($id: ID!) {
        agent(id: $id) {
          id
          totalActivities
          passport { reputationScore }
        }
      }
    `, { id: agentId });
    return data.agent ?? null;
  } catch {
    return null;
  }
}

// ── Usage analytics per API key ───────────────────────────────────────────────

export async function getUsageStats(apiKeyId: string, days = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [totalUsage, byEndpoint] = await Promise.all([
    db.apiKeyUsage.count({
      where: { apiKeyId, timestamp: { gte: since } },
    }),
    db.apiKeyUsage.groupBy({
      by:     ["endpoint"],
      where:  { apiKeyId, timestamp: { gte: since } },
      _count: { endpoint: true },
      orderBy:{ _count: { endpoint: "desc" } },
    }),
  ]);

  return {
    period:     `last_${days}_days`,
    totalCalls: totalUsage,
    byEndpoint: byEndpoint.map(e => ({
      endpoint: e.endpoint,
      calls:    e._count.endpoint,
    })),
  };
}
