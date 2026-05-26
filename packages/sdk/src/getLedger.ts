import { type PublicClient } from "viem";
import { VAEL_LEDGER_ABI } from "./abis";
import type { VaelConfig, ActivityEntry, ActivityFilter } from "./types";

/**
 * getLedger
 *
 * Fetches activity entries for an agent.
 * Prefers the Vael API (indexed, paginated, fast) when apiUrl is configured.
 * Falls back to direct contract reads (most recent N entries).
 */
export async function getLedger(
  agentId:      `0x${string}`,
  filter:       ActivityFilter,
  config:       VaelConfig,
  publicClient: PublicClient,
): Promise<ActivityEntry[]> {

  // ── API path (fast, paginated, filterable) ───────────────────────────────
  if (config.apiUrl) {
    try {
      const params = new URLSearchParams();
      if (filter.action)        params.set("action",        filter.action);
      if (filter.limit)         params.set("limit",         filter.limit.toString());
      if (filter.fromTimestamp) params.set("fromTimestamp", filter.fromTimestamp.toString());
      if (filter.toTimestamp)   params.set("toTimestamp",   filter.toTimestamp.toString());
      params.set("orderDir", "desc");

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (config.apiKey) headers["x-api-key"] = config.apiKey;

      const res  = await fetch(`${config.apiUrl}/v1/ledger/${agentId}?${params}`, { headers });
      const json = await res.json() as { data: ActivityEntry[] };
      return json.data ?? [];
    } catch { /* fall through to contract */ }
  }

  // ── Contract path (direct, no pagination) ────────────────────────────────
  const count = BigInt(filter.limit ?? 20);
  const entries = await publicClient.readContract({
    address:      config.contracts.ledger,
    abi:          VAEL_LEDGER_ABI,
    functionName: "getRecentEntries",
    args:         [agentId, count],
  }) as any[];

  return entries.map(normaliseEntry);
}

/**
 * getLedgerEntry
 * Fetch a single activity entry by agentId + entryId directly from chain.
 */
export async function getLedgerEntry(
  agentId:      `0x${string}`,
  entryId:      bigint,
  config:       VaelConfig,
  publicClient: PublicClient,
): Promise<ActivityEntry> {
  const entry = await publicClient.readContract({
    address:      config.contracts.ledger,
    abi:          VAEL_LEDGER_ABI,
    functionName: "getEntry",
    args:         [agentId, entryId],
  }) as any;

  return normaliseEntry(entry);
}

/**
 * getTotalEntries
 * Returns the total number of ledger entries for an agent.
 */
export async function getTotalEntries(
  agentId:      `0x${string}`,
  config:       VaelConfig,
  publicClient: PublicClient,
): Promise<bigint> {
  return publicClient.readContract({
    address:      config.contracts.ledger,
    abi:          VAEL_LEDGER_ABI,
    functionName: "getTotalEntries",
    args:         [agentId],
  }) as Promise<bigint>;
}

function normaliseEntry(raw: any): ActivityEntry {
  return {
    entryId:       BigInt(raw.entryId),
    agentId:       raw.agentId,
    action:        raw.action,
    payload:       raw.payload,
    target:        raw.target,
    timestamp:     BigInt(raw.timestamp),
    blockNumber:   BigInt(raw.blockNumber),
    conditionHash: raw.conditionHash,
  };
}
