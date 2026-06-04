import { graphClient } from "../graphClient";
import { gql } from "graphql-request";

const GET_AGENT_MEMORY = gql`
  query GetAgentMemory($agentId: ID!) {
    agentMemory(id: $agentId) {
      id
      entries {
        key
        value
        updatedAt
        version
      }
      totalEntries
      lastUpdatedAt
    }
  }
`;

const GET_MEMORY_ENTRY = gql`
  query GetMemoryEntry($agentId: String!, $key: String!) {
    memoryEntries(
      where: { agent: $agentId, key: $key }
      first: 1
    ) {
      key
      value
      updatedAt
      version
    }
  }
`;

const GET_AGENT_CONDITIONS = gql`
  query GetAgentConditions($agentId: String!) {
    conditions(
      where: { agentId: $agentId }
      orderBy: createdAt
      orderDirection: desc
    ) {
      id
      conditionId
      name
      condType
      actionTag
      maxTriggers
      triggerCount
      lastTriggered
      expiresAt
      status
      createdAt
    }
  }
`;

// ── Memory queries ────────────────────────────────────────────────────────────

export async function getAgentMemory(agentId: string) {
  try {
    const data = await graphClient.request<{ agentMemory: any }>(
      GET_AGENT_MEMORY, { agentId }
    );
    return data.agentMemory ?? { entries: [], totalEntries: 0 };
  } catch {
    return { entries: [], totalEntries: 0 };
  }
}

export async function getMemoryEntry(agentId: string, key: string) {
  try {
    const data = await graphClient.request<{ memoryEntries: any[] }>(
      GET_MEMORY_ENTRY, { agentId, key }
    );
    return data.memoryEntries?.[0] ?? null;
  } catch {
    return null;
  }
}

// ── Condition queries ─────────────────────────────────────────────────────────

export async function getAgentConditions(agentId: string) {
  try {
    const data = await graphClient.request<{ conditions: any[] }>(
      GET_AGENT_CONDITIONS, { agentId }
    );
    return data.conditions ?? [];
  } catch {
    return [];
  }
}

export async function getConditionStats() {
  try {
    const data = await graphClient.request<any>(gql`
      query ConditionStats {
        conditionStats(id: "global") {
          totalConditions
          activeConditions
          totalTriggers
        }
      }
    `);
    return data.conditionStats ?? { totalConditions: 0, activeConditions: 0, totalTriggers: 0 };
  } catch {
    return { totalConditions: 0, activeConditions: 0, totalTriggers: 0 };
  }
}
