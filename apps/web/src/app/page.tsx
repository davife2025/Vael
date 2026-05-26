"use client";
import { useState } from "react";
import { SearchBar }   from "@/components/SearchBar";
import { StatsBar }    from "@/components/StatsBar";
import { AgentCard }   from "@/components/AgentCard";
import { LiveFeed }    from "@/components/LiveFeed";
import { useAgents }   from "@/hooks/useVael";

const AGENT_TYPES = ["All", "trading", "oracle", "npc", "social", "guardian", "bridge"];
const ORDER_OPTIONS = [
  { value: "createdAt",       label: "Newest"     },
  { value: "totalActivities", label: "Most Active" },
  { value: "reputationScore", label: "Top Rated"  },
];

export default function HomePage() {
  const [activeType, setActiveType]   = useState("All");
  const [orderBy,    setOrderBy]      = useState("createdAt");
  const [page,       setPage]         = useState(1);

  const params: Record<string, string> = {
    orderBy, orderDir: "desc", page: page.toString(), limit: "12",
  };
  if (activeType !== "All") params.agentType = activeType;

  const { agents, total, hasMore, loading } = useAgents(params);

  return (
    <div style={{ animation: "fade-in 0.3s ease" }}>

      {/* Hero */}
      <div style={{ textAlign: "center", marginBottom: "40px", paddingTop: "12px" }}>
        <h1 style={{
          fontSize: "42px", fontWeight: 600, letterSpacing: "-1.5px",
          color: "var(--vael-text-1)", lineHeight: 1.1, marginBottom: "12px",
        }}>
          Every agent has a story.<br />
          <span style={{ color: "var(--vael-purple)" }} className="text-glow">Vael makes it visible.</span>
        </h1>
        <p style={{ fontSize: "16px", color: "var(--vael-text-2)", maxWidth: "520px", margin: "0 auto 28px" }}>
          The canonical agent registry, ledger, and reputation layer for Somnia's Agentic L1.
        </p>
        <SearchBar />
      </div>

      {/* Stats */}
      <StatsBar />

      {/* Live feed */}
      <div style={{ marginBottom: "40px" }}>
        <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--vael-text-2)", marginBottom: "12px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
          Live Feed
        </div>
        <LiveFeed />
      </div>

      {/* Agent explorer */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--vael-text-2)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            All Agents {total > 0 && <span style={{ color: "var(--vael-text-3)" }}>· {total.toLocaleString()}</span>}
          </div>

          {/* Order select */}
          <select
            value={orderBy}
            onChange={e => { setOrderBy(e.target.value); setPage(1); }}
            style={{
              background: "var(--vael-bg-card)", border: "1px solid var(--vael-border)",
              borderRadius: "8px", padding: "6px 12px", color: "var(--vael-text-2)",
              fontSize: "13px", cursor: "pointer", outline: "none",
            }}
          >
            {ORDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Type filter */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
          {AGENT_TYPES.map(type => (
            <button
              key={type}
              onClick={() => { setActiveType(type); setPage(1); }}
              style={{
                padding: "6px 14px", borderRadius: "8px", fontSize: "13px", cursor: "pointer",
                border: activeType === type ? "1px solid var(--vael-purple)" : "1px solid var(--vael-border)",
                background: activeType === type ? "rgba(124,111,255,0.12)" : "var(--vael-bg-card)",
                color: activeType === type ? "var(--vael-purple)" : "var(--vael-text-2)",
                fontWeight: activeType === type ? 600 : 400,
                transition: "all 0.15s",
              }}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "14px",
          }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{
                height: "160px", borderRadius: "14px",
                background: "var(--vael-bg-card)", border: "1px solid var(--vael-border)",
                animation: "pulse-soft 1.5s ease-in-out infinite",
              }} />
            ))}
          </div>
        ) : agents.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "60px 20px",
            color: "var(--vael-text-3)", fontSize: "14px",
          }}>
            No agents found. {activeType !== "All" && (
              <button onClick={() => setActiveType("All")} style={{ color: "var(--vael-purple)", background: "none", border: "none", cursor: "pointer" }}>
                Clear filter
              </button>
            )}
          </div>
        ) : (
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "14px",
            animation: "fade-in 0.2s ease",
          }}>
            {agents.map(agent => <AgentCard key={agent.id} agent={agent} />)}
          </div>
        )}

        {/* Pagination */}
        {(page > 1 || hasMore) && (
          <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginTop: "28px" }}>
            {page > 1 && (
              <button onClick={() => setPage(p => p - 1)} style={{
                padding: "8px 20px", borderRadius: "8px", border: "1px solid var(--vael-border)",
                background: "var(--vael-bg-card)", color: "var(--vael-text-2)", cursor: "pointer", fontSize: "13px",
              }}>← Previous</button>
            )}
            {hasMore && (
              <button onClick={() => setPage(p => p + 1)} style={{
                padding: "8px 20px", borderRadius: "8px", border: "1px solid var(--vael-border)",
                background: "var(--vael-bg-card)", color: "var(--vael-text-2)", cursor: "pointer", fontSize: "13px",
              }}>Next →</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
