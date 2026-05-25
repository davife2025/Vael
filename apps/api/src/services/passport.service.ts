import { db } from "../db";
import { graphClient } from "../graphClient";
import { gql } from "graphql-request";

const GET_PASSPORT = gql`
  query GetPassport($agentId: ID!) {
    passport(id: $agentId) {
      tokenId
      reputationScore
      totalActions
      issuedAt
      lastActivityAt
      verified
      agent {
        id
        owner
        agentType
        active
      }
    }
  }
`;

const GET_PASSPORT_BY_TOKEN = gql`
  query GetPassportByToken($tokenId: BigInt!) {
    passports(where: { tokenId: $tokenId }, first: 1) {
      id
      tokenId
      reputationScore
      totalActions
      issuedAt
      lastActivityAt
      verified
      agent {
        id
        owner
        agentType
      }
    }
  }
`;

export async function getPassport(agentId: string) {
  try {
    const data = await graphClient.request<{ passport: any }>(GET_PASSPORT, { agentId });
    return data.passport ?? null;
  } catch {
    const agent = await db.agent.findUnique({ where: { id: agentId } });
    if (!agent?.passportTokenId) return null;
    return {
      agentId,
      tokenId:        agent.passportTokenId,
      reputationScore:agent.reputationScore,
      totalActions:   agent.totalActivities,
      verified:       agent.verified,
    };
  }
}

export async function getPassportByToken(tokenId: string) {
  try {
    const data = await graphClient.request<{ passports: any[] }>(
      GET_PASSPORT_BY_TOKEN, { tokenId }
    );
    return data.passports?.[0] ?? null;
  } catch {
    const agent = await db.agent.findFirst({ where: { passportTokenId: tokenId } });
    return agent ?? null;
  }
}

// Reputation leaderboard — top agents by score
export async function getLeaderboard(limit: number = 20) {
  try {
    const data = await graphClient.request<{ passports: any[] }>(gql`
      query Leaderboard($first: Int) {
        passports(
          first: $first
          orderBy: reputationScore
          orderDirection: desc
          where: { reputationScore_gt: 0 }
        ) {
          id
          tokenId
          reputationScore
          verified
          agent {
            id
            agentType
            owner
            totalActivities
          }
        }
      }
    `, { first: limit });
    return data.passports;
  } catch {
    return db.agent.findMany({
      orderBy: { reputationScore: "desc" },
      take:    limit,
      where:   { reputationScore: { gt: 0 } },
    });
  }
}
