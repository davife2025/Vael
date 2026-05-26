"use client";
import { useState, useEffect, useCallback } from "react";
import { api, type AgentSummary, type ActivitySummary, type PassportData } from "@/lib/api";

// ─── useAgent ─────────────────────────────────────────────────────────────────

export function useAgent(agentId: string | null) {
  const [agent,   setAgent]   = useState<AgentSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!agentId) return;
    setLoading(true);
    setError(null);
    api.agents.get(agentId)
      .then(r => setAgent(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [agentId]);

  return { agent, loading, error };
}

// ─── useAgents ────────────────────────────────────────────────────────────────

export function useAgents(params?: Record<string, string>) {
  const [agents,  setAgents]  = useState<AgentSummary[]>([]);
  const [total,   setTotal]   = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const key = JSON.stringify(params);

  useEffect(() => {
    setLoading(true);
    api.agents.list(params)
      .then(r => { setAgents(r.data); setTotal(r.total); setHasMore(r.hasMore); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [key]);

  return { agents, total, hasMore, loading, error };
}

// ─── useLedger ────────────────────────────────────────────────────────────────

export function useLedger(agentId: string | null, params?: Record<string, string>) {
  const [entries, setEntries] = useState<ActivitySummary[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!agentId) return;
    setLoading(true);
    api.ledger.list(agentId, params)
      .then(r => { setEntries(r.data); setHasMore(r.hasMore); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [agentId, JSON.stringify(params)]);

  return { entries, hasMore, loading, error };
}

// ─── usePassport ──────────────────────────────────────────────────────────────

export function usePassport(agentId: string | null) {
  const [passport, setPassport] = useState<PassportData | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    if (!agentId) return;
    setLoading(true);
    api.passport.get(agentId)
      .then(r => setPassport(r.data))
      .catch(() => setPassport(null))
      .finally(() => setLoading(false));
  }, [agentId]);

  return { passport, loading, error };
}

// ─── useStats ─────────────────────────────────────────────────────────────────

export function useStats() {
  const [stats,   setStats]   = useState<{ totalAgents: string; totalActivities: string; totalPassports: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.agents.stats()
      .then(r => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { stats, loading };
}

// ─── useLiveFeed ──────────────────────────────────────────────────────────────

export function useLiveFeed(limit = 8) {
  const [agents,     setAgents]     = useState<AgentSummary[]>([]);
  const [activities, setActivities] = useState<ActivitySummary[]>([]);
  const [loading,    setLoading]    = useState(false);

  const refresh = useCallback(() => {
    api.agents.feed(limit)
      .then(r => { setAgents(r.data.agents); setActivities(r.data.activities); })
      .catch(() => {});
  }, [limit]);

  useEffect(() => {
    setLoading(true);
    refresh();
    setLoading(false);

    // Poll every 10 seconds
    const interval = setInterval(refresh, 10_000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { agents, activities, loading, refresh };
}

// ─── useLeaderboard ───────────────────────────────────────────────────────────

export function useLeaderboard(limit = 20) {
  const [entries, setEntries] = useState<PassportData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.passport.leaderboard(limit)
      .then(r => setEntries(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [limit]);

  return { entries, loading };
}

// ─── useSearch ────────────────────────────────────────────────────────────────

export function useSearch() {
  const [query,   setQuery]   = useState("");
  const [results, setResults] = useState<AgentSummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.length < 3) { setResults([]); return; }

    const timer = setTimeout(() => {
      setLoading(true);

      // If query looks like an agentId (0x + 64 hex chars), fetch directly
      if (/^0x[0-9a-fA-F]{64}$/.test(query)) {
        api.agents.get(query)
          .then(r => setResults([r.data]))
          .catch(() => setResults([]))
          .finally(() => setLoading(false));
      } else {
        // Otherwise search by owner address or agentType
        const params: Record<string, string> = { limit: "10" };
        if (/^0x[0-9a-fA-F]{40}$/.test(query)) params.owner = query;
        else params.agentType = query;

        api.agents.list(params)
          .then(r => setResults(r.data))
          .catch(() => setResults([]))
          .finally(() => setLoading(false));
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [query]);

  return { query, setQuery, results, loading };
}
