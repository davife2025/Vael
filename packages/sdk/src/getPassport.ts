import { type PublicClient } from "viem";
import { VAEL_PASSPORT_ABI } from "./abis";
import type { VaelConfig, Passport } from "./types";

/**
 * getPassport
 * Fetch a Vael passport by agentId.
 * Tries API first (includes off-chain enrichment), falls back to contract read.
 */
export async function getPassport(
  agentId:      `0x${string}`,
  config:       VaelConfig,
  publicClient: PublicClient,
): Promise<Passport | null> {

  // ── API path ─────────────────────────────────────────────────────────────
  if (config.apiUrl) {
    try {
      const headers: Record<string, string> = {};
      if (config.apiKey) headers["x-api-key"] = config.apiKey;

      const res  = await fetch(`${config.apiUrl}/v1/passport/${agentId}`, { headers });
      if (res.status === 404) return null;
      const json = await res.json() as { data: Passport };
      return json.data ?? null;
    } catch { /* fall through */ }
  }

  // ── Contract path ─────────────────────────────────────────────────────────
  const has = await publicClient.readContract({
    address:      config.contracts.passport,
    abi:          VAEL_PASSPORT_ABI,
    functionName: "hasPassport",
    args:         [agentId],
  }) as boolean;

  if (!has) return null;

  const raw = await publicClient.readContract({
    address:      config.contracts.passport,
    abi:          VAEL_PASSPORT_ABI,
    functionName: "getPassport",
    args:         [agentId],
  }) as any;

  return normalisePassport(raw);
}

/**
 * getPassportByToken
 * Fetch a Vael passport by its ERC-721 tokenId.
 */
export async function getPassportByToken(
  tokenId:      bigint,
  config:       VaelConfig,
  publicClient: PublicClient,
): Promise<Passport | null> {
  if (config.apiUrl) {
    try {
      const headers: Record<string, string> = {};
      if (config.apiKey) headers["x-api-key"] = config.apiKey;

      const res  = await fetch(`${config.apiUrl}/v1/passport/token/${tokenId}`, { headers });
      if (res.status === 404) return null;
      const json = await res.json() as { data: Passport };
      return json.data ?? null;
    } catch { /* fall through */ }
  }

  try {
    const raw = await publicClient.readContract({
      address:      config.contracts.passport,
      abi:          VAEL_PASSPORT_ABI,
      functionName: "getPassportByToken",
      args:         [tokenId],
    }) as any;
    return normalisePassport(raw);
  } catch {
    return null;
  }
}

function normalisePassport(raw: any): Passport {
  return {
    agentId:         raw.agentId,
    tokenId:         BigInt(raw.tokenId),
    reputationScore: BigInt(raw.reputationScore),
    totalActions:    BigInt(raw.totalActions),
    issuedAt:        BigInt(raw.issuedAt),
    lastActivityAt:  BigInt(raw.lastActivityAt),
    verified:        raw.verified,
  };
}
