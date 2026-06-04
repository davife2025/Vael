import type {
  GatePolicy,
  GateResult,
  AgentRecord,
  VaelGateConfig,
} from "./types";
import { GateDenyReason } from "./types";

// ─── Simple in-memory cache ───────────────────────────────────────────────────

interface CacheEntry { data: AgentRecord; expiresAt: number; }
const _cache = new Map<string, CacheEntry>();

function getCached(agentId: string, ttl: number): AgentRecord | null {
  const entry = _cache.get(agentId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { _cache.delete(agentId); return null; }
  return entry.data;
}

function setCached(agentId: string, data: AgentRecord, ttl: number): void {
  _cache.set(agentId, { data, expiresAt: Date.now() + ttl * 1000 });
}

// ─── Fetch agent from Vael API ────────────────────────────────────────────────

async function fetchAgent(agentId: string, config: VaelGateConfig): Promise<AgentRecord | null> {
  const cached = getCached(agentId, config.cacheTtl ?? 60);
  if (cached) return cached;

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (config.apiKey) headers["x-api-key"] = config.apiKey;

    const [agentRes, passportRes] = await Promise.all([
      fetch(`${config.apiUrl}/v1/agents/${agentId}`,   { headers }),
      fetch(`${config.apiUrl}/v1/passport/${agentId}`, { headers }),
    ]);

    if (!agentRes.ok) return null;

    const agentData   = await agentRes.json() as { data: any };
    const passData    = passportRes.ok ? await passportRes.json() as { data: any } : null;

    const record: AgentRecord = {
      agentId:         agentData.data.id as `0x${string}`,
      owner:           agentData.data.owner,
      agentType:       agentData.data.agentType,
      active:          agentData.data.active,
      createdAt:       BigInt(agentData.data.createdAt ?? 0),
      totalActivities: BigInt(agentData.data.totalActivities ?? 0),
      passport: passData?.data ? {
        reputationScore: BigInt(passData.data.reputationScore ?? 0),
        verified:        passData.data.verified ?? false,
        tokenId:         BigInt(passData.data.tokenId ?? 0),
        issuedAt:        BigInt(passData.data.issuedAt ?? 0),
      } : undefined,
    };

    setCached(agentId, record, config.cacheTtl ?? 60);
    return record;
  } catch {
    return null;
  }
}

// ─── Core policy evaluator ────────────────────────────────────────────────────

export async function evaluatePolicy(
  agentId: string,
  policy:  GatePolicy,
  config:  VaelGateConfig,
): Promise<GateResult> {

  // Merge with default policy
  const merged: GatePolicy = { ...config.defaultPolicy, ...policy };

  // Fetch agent
  const agent = await fetchAgent(agentId, config);

  if (!agent) return deny(GateDenyReason.NETWORK_ERROR, "Agent not found or API unreachable");

  // ── Active check ─────────────────────────────────────────────────────────
  if (!agent.active) return deny(GateDenyReason.AGENT_INACTIVE, "Agent is inactive");

  // ── Passport check ───────────────────────────────────────────────────────
  if (merged.requirePassport !== false) {
    if (!agent.passport) return deny(GateDenyReason.NO_PASSPORT, "Agent does not have a Vael Passport");
  }

  // ── Verified check ───────────────────────────────────────────────────────
  if (merged.requireVerified) {
    if (!agent.passport?.verified)
      return deny(GateDenyReason.NOT_VERIFIED, "Agent passport is not Vael-verified");
  }

  // ── Reputation check ─────────────────────────────────────────────────────
  if (merged.minReputation !== undefined && merged.minReputation > 0) {
    const score = Number(agent.passport?.reputationScore ?? 0n);
    if (score < merged.minReputation)
      return deny(
        GateDenyReason.INSUFFICIENT_REP,
        `Agent reputation score ${score} is below minimum ${merged.minReputation}`
      );
  }

  // ── Type allow-list ──────────────────────────────────────────────────────
  if (merged.allowedTypes && merged.allowedTypes.length > 0) {
    if (!merged.allowedTypes.includes(agent.agentType))
      return deny(
        GateDenyReason.TYPE_NOT_ALLOWED,
        `Agent type "${agent.agentType}" is not in the allowed list: [${merged.allowedTypes.join(", ")}]`
      );
  }

  // ── Type block-list ──────────────────────────────────────────────────────
  if (merged.blockedTypes && merged.blockedTypes.length > 0) {
    if (merged.blockedTypes.includes(agent.agentType))
      return deny(
        GateDenyReason.TYPE_BLOCKED,
        `Agent type "${agent.agentType}" is blocked`
      );
  }

  // ── Registration age ─────────────────────────────────────────────────────
  if (merged.registeredAfter !== undefined) {
    if (Number(agent.createdAt) < merged.registeredAfter)
      return deny(
        GateDenyReason.TOO_NEW,
        `Agent was registered before the required date`
      );
  }

  // ── Activity minimum ─────────────────────────────────────────────────────
  if (merged.minActivities !== undefined && merged.minActivities > 0) {
    if (Number(agent.totalActivities) < merged.minActivities)
      return deny(
        GateDenyReason.INSUFFICIENT_ACTIVITY,
        `Agent has ${agent.totalActivities} activities, minimum required is ${merged.minActivities}`
      );
  }

  // ── Custom validator ─────────────────────────────────────────────────────
  if (merged.customValidator) {
    const passed = await merged.customValidator(agent);
    if (!passed) return deny(GateDenyReason.CUSTOM_REJECTED, "Agent rejected by custom validator");
  }

  return { allowed: true, agent };
}

function deny(reason: GateDenyReason, message: string): GateResult {
  return { allowed: false, reason, message };
}

// ─── Simple gate check (boolean) ─────────────────────────────────────────────

export async function canPass(
  agentId: string,
  policy:  GatePolicy,
  config:  VaelGateConfig,
): Promise<boolean> {
  const result = await evaluatePolicy(agentId, policy, config);
  return result.allowed;
}

// ─── Clear cache (useful in tests) ───────────────────────────────────────────

export function clearCache(): void { _cache.clear(); }
