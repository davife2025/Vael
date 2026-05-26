import { type PublicClient } from "viem";
import { VAEL_REGISTRY_ABI } from "./abis";
import type { VaelConfig, AgentRecord, AgentFilter, PaginatedResponse } from "./types";

/**
 * getAgent
 * Fetch a single agent record by agentId.
 * API-first (enriched with name/description), contract fallback.
 */
export async function getAgent(
  agentId:      `0x${string}`,
  config:       VaelConfig,
  publicClient: PublicClient,
): Promise<AgentRecord | null> {

  if (config.apiUrl) {
    try {
      const headers: Record<string, string> = {};
      if (config.apiKey) headers["x-api-key"] = config.apiKey;

      const res  = await fetch(`${config.apiUrl}/v1/agents/${agentId}`, { headers });
      if (res.status === 404) return null;
      const json = await res.json() as { data: AgentRecord };
      return json.data;
    } catch { /* fall through */ }
  }

  const isReg = await publicClient.readContract({
    address:      config.contracts.registry,
    abi:          VAEL_REGISTRY_ABI,
    functionName: "isRegistered",
    args:         [agentId],
  }) as boolean;

  if (!isReg) return null;

  const raw = await publicClient.readContract({
    address:      config.contracts.registry,
    abi:          VAEL_REGISTRY_ABI,
    functionName: "getAgent",
    args:         [agentId],
  }) as any;

  return normaliseAgent(raw);
}

/**
 * getAgentsByOwner
 * Fetch all agentIds owned by a wallet, then resolve full records.
 */
export async function getAgentsByOwner(
  owner:        `0x${string}`,
  config:       VaelConfig,
  publicClient: PublicClient,
): Promise<AgentRecord[]> {

  if (config.apiUrl) {
    try {
      const headers: Record<string, string> = {};
      if (config.apiKey) headers["x-api-key"] = config.apiKey;

      const res  = await fetch(`${config.apiUrl}/v1/agents?owner=${owner}&limit=100`, { headers });
      const json = await res.json() as PaginatedResponse<AgentRecord>;
      return json.data ?? [];
    } catch { /* fall through */ }
  }

  const ids = await publicClient.readContract({
    address:      config.contracts.registry,
    abi:          VAEL_REGISTRY_ABI,
    functionName: "getAgentsByOwner",
    args:         [owner],
  }) as `0x${string}`[];

  if (!ids.length) return [];

  // Resolve each agent in parallel (batched to avoid rate limits)
  const batch  = 10;
  const agents: AgentRecord[] = [];

  for (let i = 0; i < ids.length; i += batch) {
    const chunk = ids.slice(i, i + batch);
    const resolved = await Promise.allSettled(
      chunk.map(id =>
        publicClient.readContract({
          address:      config.contracts.registry,
          abi:          VAEL_REGISTRY_ABI,
          functionName: "getAgent",
          args:         [id],
        })
      )
    );
    for (const r of resolved) {
      if (r.status === "fulfilled") agents.push(normaliseAgent(r.value));
    }
  }

  return agents;
}

/**
 * getTotalAgents
 * Returns the total number of agents ever registered on Vael.
 */
export async function getTotalAgents(
  config:       VaelConfig,
  publicClient: PublicClient,
): Promise<bigint> {
  return publicClient.readContract({
    address:      config.contracts.registry,
    abi:          VAEL_REGISTRY_ABI,
    functionName: "totalAgents",
  }) as Promise<bigint>;
}

function normaliseAgent(raw: any): AgentRecord {
  return {
    agentId:     raw.agentId,
    owner:       raw.owner,
    agentType:   raw.agentType,
    metadataURI: raw.metadataURI,
    createdAt:   BigInt(raw.createdAt),
    blockNumber: BigInt(raw.blockNumber),
    active:      raw.active,
  };
}
