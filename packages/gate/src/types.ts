import type { Address, Hex } from "viem";

// ─── Gate policy ──────────────────────────────────────────────────────────────

export interface GatePolicy {
  /** Minimum passport reputation score required (0–1000). Default: 0 */
  minReputation?: number;

  /** Require agent to have a Vael Passport. Default: true */
  requirePassport?: boolean;

  /** Require passport to be Vael-verified. Default: false */
  requireVerified?: boolean;

  /** Only allow agents of these types. Empty = allow all. */
  allowedTypes?: string[];

  /** Block agents of these types. */
  blockedTypes?: string[];

  /** Only allow agents registered after this Unix timestamp. */
  registeredAfter?: number;

  /** Minimum number of ledger entries (proof of activity). */
  minActivities?: number;

  /** Custom validator — receives full agent record, return true to allow. */
  customValidator?: (agent: AgentRecord) => boolean | Promise<boolean>;
}

// ─── Agent record (subset of full record for gate use) ────────────────────────

export interface AgentRecord {
  agentId:         Hex;
  owner:           Address;
  agentType:       string;
  active:          boolean;
  createdAt:       bigint;
  totalActivities: bigint;
  passport?: {
    reputationScore: bigint;
    verified:        boolean;
    tokenId:         bigint;
    issuedAt:        bigint;
  };
}

// ─── Gate result ──────────────────────────────────────────────────────────────

export type GateResult =
  | { allowed: true;  agent: AgentRecord }
  | { allowed: false; reason: GateDenyReason; message: string };

export enum GateDenyReason {
  NOT_REGISTERED     = "NOT_REGISTERED",
  AGENT_INACTIVE     = "AGENT_INACTIVE",
  NO_PASSPORT        = "NO_PASSPORT",
  NOT_VERIFIED       = "NOT_VERIFIED",
  INSUFFICIENT_REP   = "INSUFFICIENT_REP",
  TYPE_NOT_ALLOWED   = "TYPE_NOT_ALLOWED",
  TYPE_BLOCKED       = "TYPE_BLOCKED",
  TOO_NEW            = "TOO_NEW",
  INSUFFICIENT_ACTIVITY = "INSUFFICIENT_ACTIVITY",
  CUSTOM_REJECTED    = "CUSTOM_REJECTED",
  NETWORK_ERROR      = "NETWORK_ERROR",
}

// ─── VaelGate config ──────────────────────────────────────────────────────────

export interface VaelGateConfig {
  /** Vael API base URL — used for fast indexed queries */
  apiUrl: string;

  /** Optional API key for higher rate limits */
  apiKey?: string;

  /** Default policy applied to all gates (can be overridden per-gate) */
  defaultPolicy?: GatePolicy;

  /** Cache TTL in seconds — agent data cached to reduce API calls. Default: 60 */
  cacheTtl?: number;
}
