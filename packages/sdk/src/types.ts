import type { Address, Hash, Hex } from "viem";

// ─── Agent Types ─────────────────────────────────────────────────────────────

export interface AgentRecord {
  agentId: Hex;
  owner: Address;
  agentType: string;
  metadataURI: string;
  createdAt: bigint;
  blockNumber: bigint;
  active: boolean;
}

export interface AgentMetadata {
  name: string;
  description: string;
  image?: string;
  capabilities: string[];
  model?: string;
  framework?: string;
  external_url?: string;
  attributes?: Array<{ trait_type: string; value: string | number }>;
}

// ─── Activity Types ───────────────────────────────────────────────────────────

export interface ActivityEntry {
  entryId: bigint;
  agentId: Hex;
  action: string;
  payload: Hex;
  target: Address;
  timestamp: bigint;
  blockNumber: bigint;
  conditionHash: Hex;
}

export type ActionType =
  | "transfer"
  | "vote"
  | "trade"
  | "message"
  | "stake"
  | "unstake"
  | "delegate"
  | "execute"
  | "custom";

// ─── Passport Types ───────────────────────────────────────────────────────────

export interface Passport {
  agentId: Hex;
  tokenId: bigint;
  reputationScore: bigint;   // 0–1000
  totalActions: bigint;
  issuedAt: bigint;
  lastActivityAt: bigint;
  verified: boolean;
}

// ─── SDK Config ────────────────────────────────────────────────────────────────

export interface VaelConfig {
  rpcUrl: string;
  chainId: number;
  contracts: {
    registry: Address;
    ledger: Address;
    passport: Address;
    reputation?: Address;
  };
  apiUrl?: string;           // Optional: Vael REST API for off-chain enrichment
  apiKey?: string;           // Optional: for paid API tiers
}

// ─── API Response Types ────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ─── Registration ──────────────────────────────────────────────────────────────

export interface RegisterAgentParams {
  agentType: ActionType | string;
  metadata: AgentMetadata;
  issuePassport?: boolean;   // Auto-issue passport on registration (default: true)
}

export interface RegisterAgentResult {
  agentId: Hex;
  txHash: Hash;
  passportTokenId?: bigint;
}

// ─── Query Filters ─────────────────────────────────────────────────────────────

export interface AgentFilter {
  owner?: Address;
  agentType?: string;
  active?: boolean;
  minReputation?: number;
}

export interface ActivityFilter {
  agentId: Hex;
  action?: string;
  fromTimestamp?: bigint;
  toTimestamp?: bigint;
  limit?: number;
}

// ─── Log Activity ─────────────────────────────────────────────────────────────

export interface LogActivityParams {
  agentId:   Hex;
  action:    string;
  payload?:  Uint8Array | Record<string, unknown>;
  target?:   Address;
  condition?: string; // Human-readable condition string — hashed to bytes32
}
