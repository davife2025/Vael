const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

// ─── Agents ───────────────────────────────────────────────────────────────────

export interface AgentSummary {
  id:              string;
  owner:           string;
  agentType:       string;
  name?:           string;
  description?:    string;
  imageUrl?:       string;
  createdAt:       string;
  active:          boolean;
  totalActivities: string;
  lastActivityAt?: string;
  passport?: {
    tokenId:         string;
    reputationScore: string;
    verified:        boolean;
  };
}

export interface AgentsResponse {
  success: boolean;
  data:    AgentSummary[];
  total:   number;
  page:    number;
  limit:   number;
  hasMore: boolean;
}

export interface StatsResponse {
  success: boolean;
  data: {
    totalAgents:     string;
    totalActivities: string;
    totalPassports:  string;
    lastUpdatedAt:   string;
  };
}

export interface FeedResponse {
  success: boolean;
  data: {
    agents:     AgentSummary[];
    activities: ActivitySummary[];
  };
}

// ─── Activities ───────────────────────────────────────────────────────────────

export interface ActivitySummary {
  id:              string;
  entryId:         string;
  action:          string;
  target?:         string;
  timestamp:       string;
  blockNumber:     string;
  transactionHash: string;
  conditionHash:   string;
  agent?: { id: string; agentType: string };
}

export interface LedgerResponse {
  success: boolean;
  data:    ActivitySummary[];
  page:    number;
  limit:   number;
  hasMore: boolean;
}

// ─── Passport ─────────────────────────────────────────────────────────────────

export interface PassportData {
  agentId:         string;
  tokenId:         string;
  reputationScore: string;
  totalActions:    string;
  issuedAt:        string;
  lastActivityAt:  string;
  verified:        boolean;
  agent?: AgentSummary;
}

export interface LeaderboardResponse {
  success: boolean;
  data:    PassportData[];
}

// ─── API functions ────────────────────────────────────────────────────────────

export const api = {
  agents: {
    list: (params?: Record<string, string>) => {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return apiFetch<AgentsResponse>(`/v1/agents${qs}`);
    },
    get:   (agentId: string) =>
      apiFetch<{ success: boolean; data: AgentSummary }>(`/v1/agents/${agentId}`),
    stats: () =>
      apiFetch<StatsResponse>("/v1/agents/stats"),
    feed:  (limit = 10) =>
      apiFetch<FeedResponse>(`/v1/agents/feed?limit=${limit}`),
  },

  ledger: {
    list: (agentId: string, params?: Record<string, string>) => {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return apiFetch<LedgerResponse>(`/v1/ledger/${agentId}${qs}`);
    },
    entry: (agentId: string, entryId: string) =>
      apiFetch<{ success: boolean; data: ActivitySummary }>(
        `/v1/ledger/${agentId}/${entryId}`
      ),
  },

  passport: {
    get: (agentId: string) =>
      apiFetch<{ success: boolean; data: PassportData }>(`/v1/passport/${agentId}`),
    leaderboard: (limit = 20) =>
      apiFetch<LeaderboardResponse>(`/v1/passport/leaderboard?limit=${limit}`),
  },
};
