// ─── Address helpers ──────────────────────────────────────────────────────────

export function truncateAddress(address: string, chars = 6): string {
  if (!address || address.length < 12) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function truncateAgentId(agentId: string, chars = 8): string {
  if (!agentId || agentId.length < 12) return agentId;
  return `${agentId.slice(0, chars + 2)}...${agentId.slice(-4)}`;
}

// ─── Time helpers ─────────────────────────────────────────────────────────────

export function timeAgo(timestamp: number | bigint): string {
  const ts      = Number(timestamp);
  const seconds = Math.floor(Date.now() / 1000) - ts;

  if (seconds < 60)   return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400)return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function formatDate(timestamp: number | bigint): string {
  return new Date(Number(timestamp) * 1000).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

export function formatDateTime(timestamp: number | bigint): string {
  return new Date(Number(timestamp) * 1000).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── Reputation helpers ───────────────────────────────────────────────────────

export type ReputationTier = "unknown" | "new" | "active" | "trusted" | "elite";

export function getReputationTier(score: number | bigint): ReputationTier {
  const s = Number(score);
  if (s === 0)    return "unknown";
  if (s < 200)    return "new";
  if (s < 500)    return "active";
  if (s < 800)    return "trusted";
  return "elite";
}

export function getReputationColor(score: number | bigint): string {
  const tier = getReputationTier(score);
  return {
    unknown: "#5a5a78",
    new:     "#9090b0",
    active:  "#2dd4bf",
    trusted: "#7c6fff",
    elite:   "#fbbf24",
  }[tier];
}

export function getReputationLabel(score: number | bigint): string {
  const tier = getReputationTier(score);
  return {
    unknown: "Unscored",
    new:     "New",
    active:  "Active",
    trusted: "Trusted",
    elite:   "Elite",
  }[tier];
}

// ─── Agent type colour mapping ────────────────────────────────────────────────

export function getAgentTypeColor(agentType: string): string {
  const map: Record<string, string> = {
    trading:  "#2dd4bf",
    oracle:   "#7c6fff",
    npc:      "#4ade80",
    social:   "#f472b6",
    guardian: "#fbbf24",
    bridge:   "#60a5fa",
  };
  return map[agentType?.toLowerCase()] ?? "#9090b0";
}

// ─── Number formatting ────────────────────────────────────────────────────────

export function formatNumber(n: number | bigint): string {
  const num = Number(n);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000)     return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

// ─── Copy to clipboard ────────────────────────────────────────────────────────

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
