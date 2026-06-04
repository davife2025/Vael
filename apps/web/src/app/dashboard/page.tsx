"use client";
import { useState, useEffect } from "react";
import { OwnerAgentTable } from "@/components/OwnerAgentTable";
import { timeAgo, formatNumber, getReputationColor } from "@/lib/utils";

interface DashboardData {
  agents:        any[];
  recentActivity:any[];
  apiKeys:       any[];
  summary: {
    totalAgents:     number;
    activeAgents:    number;
    totalActivities: number;
    avgReputation:   number;
  };
}

export default function DashboardPage() {
  const [wallet,  setWallet]  = useState("");
  const [apiKey,  setApiKey]  = useState("");
  const [data,    setData]    = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  async function loadDashboard() {
    if (!wallet.trim() || !apiKey.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${apiUrl}/v1/analytics/dashboard/${wallet}`, {
        headers: { "x-api-key": apiKey },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load dashboard");
      setData(json.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const repColor = getReputationColor(data?.summary.avgReputation ?? 0);

  return (
    <div style={{ animation: "fade-in 0.3s ease" }}>

      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 600, letterSpacing: "-0.8px", color: "var(--vael-text-1)", marginBottom: "6px" }}>
          Owner Dashboard
        </h1>
        <p style={{ fontSize: "14px", color: "var(--vael-text-3)" }}>
          Manage your agents, view ledger health, track API usage, and monitor staking positions.
        </p>
      </div>

      {/* Auth form */}
      {!data && (
        <div style={{
          background: "var(--vael-bg-card)", border: "1px solid var(--vael-border)",
          borderRadius: "14px", padding: "28px", maxWidth: "480px",
        }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--vael-text-1)", marginBottom: "16px" }}>
            Connect your wallet
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {[
              { field: "wallet", label: "Wallet address", placeholder: "0x...",          val: wallet,  set: setWallet  },
              { field: "apiKey", label: "Vael API key",   placeholder: "vael_sk_...",    val: apiKey,  set: setApiKey  },
            ].map(f => (
              <div key={f.field}>
                <label style={{ fontSize: "12px", color: "var(--vael-text-3)", display: "block", marginBottom: "6px" }}>
                  {f.label}
                </label>
                <input
                  type="text"
                  value={f.val}
                  onChange={e => f.set(e.target.value)}
                  placeholder={f.placeholder}
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: "8px",
                    background: "var(--vael-bg)", border: "1px solid var(--vael-border)",
                    color: "var(--vael-text-1)", fontSize: "13px", fontFamily: "monospace",
                    outline: "none", boxSizing: "border-box",
                  }}
                />
              </div>
            ))}

            {error && (
              <div style={{ fontSize: "13px", color: "#f87171", padding: "10px 12px", background: "rgba(248,113,113,0.08)", borderRadius: "8px" }}>
                {error}
              </div>
            )}

            <button
              onClick={loadDashboard}
              disabled={loading || !wallet.trim() || !apiKey.trim()}
              style={{
                padding: "12px", borderRadius: "8px", border: "none",
                background: loading || !wallet.trim() || !apiKey.trim() ? "var(--vael-purple-dim)" : "var(--vael-purple)",
                color: "#fff", fontSize: "14px", fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                transition: "background 0.15s",
              }}
            >
              {loading ? "Loading..." : "Load Dashboard"}
            </button>
          </div>
        </div>
      )}

      {/* Dashboard */}
      {data && (
        <div>
          {/* Summary bar */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "24px" }}>
            {[
              { label: "Your Agents",   value: data.summary.totalAgents,     color: "#7c6fff" },
              { label: "Active",        value: data.summary.activeAgents,     color: "#4ade80" },
              { label: "Total Actions", value: data.summary.totalActivities,  color: "#2dd4bf" },
              { label: "Avg Reputation",value: data.summary.avgReputation,    color: repColor, sub: "/1000" },
            ].map(card => (
              <div key={card.label} style={{
                background: "var(--vael-bg-card)", border: "1px solid var(--vael-border)",
                borderRadius: "12px", padding: "16px 18px",
              }}>
                <div style={{ fontSize: "28px", fontWeight: 600, color: card.color, letterSpacing: "-0.8px", lineHeight: 1, marginBottom: "4px" }}>
                  {formatNumber(card.value)}
                  {card.sub && <span style={{ fontSize: "13px", color: "var(--vael-text-3)", fontWeight: 400 }}>{card.sub}</span>}
                </div>
                <div style={{ fontSize: "11px", color: "var(--vael-text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {card.label}
                </div>
              </div>
            ))}
          </div>

          {/* Agents table */}
          <div style={{ marginBottom: "24px" }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--vael-text-3)", marginBottom: "12px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
              Your Agents
            </div>
            <OwnerAgentTable agents={data.agents} loading={false} />
          </div>

          {/* Recent activity + API keys row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

            {/* Recent activity */}
            <div>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--vael-text-3)", marginBottom: "12px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                Recent Activity
              </div>
              <div style={{ background: "var(--vael-bg-card)", border: "1px solid var(--vael-border)", borderRadius: "14px", overflow: "hidden" }}>
                {data.recentActivity.length === 0 ? (
                  <div style={{ padding: "24px", textAlign: "center", color: "var(--vael-text-3)", fontSize: "13px" }}>
                    No activity yet
                  </div>
                ) : data.recentActivity.map((act, i) => (
                  <div key={act.id || i} style={{
                    padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px",
                    borderBottom: i < data.recentActivity.length - 1 ? "1px solid var(--vael-border)" : "none",
                  }}>
                    <div style={{
                      fontSize: "11px", padding: "2px 8px", borderRadius: "5px",
                      background: "rgba(124,111,255,0.12)", color: "#7c6fff", fontWeight: 600, flexShrink: 0,
                    }}>{act.action}</div>
                    <div style={{ fontSize: "11px", color: "var(--vael-text-3)", fontFamily: "monospace", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {act.agentId?.slice(0, 14)}...
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--vael-text-3)", flexShrink: 0 }}>
                      {timeAgo(act.timestamp ? act.timestamp.toString() : "0")}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* API keys */}
            <div>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--vael-text-3)", marginBottom: "12px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                API Keys
              </div>
              <div style={{ background: "var(--vael-bg-card)", border: "1px solid var(--vael-border)", borderRadius: "14px", overflow: "hidden" }}>
                {data.apiKeys.length === 0 ? (
                  <div style={{ padding: "24px", textAlign: "center", color: "var(--vael-text-3)", fontSize: "13px" }}>
                    No API keys — <a href="/keys" style={{ color: "#7c6fff", textDecoration: "none" }}>create one</a>
                  </div>
                ) : data.apiKeys.map((key, i) => {
                  const tierColor = key.tier === "ENTERPRISE" ? "#fbbf24" : key.tier === "PRO" ? "#7c6fff" : "#9090b0";
                  const usage     = key._count?.usage ?? 0;
                  const pct       = Math.min((usage / (key.usageLimit || 1)) * 100, 100);
                  return (
                    <div key={key.id} style={{
                      padding: "14px 16px",
                      borderBottom: i < data.apiKeys.length - 1 ? "1px solid var(--vael-border)" : "none",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--vael-text-1)" }}>{key.name}</div>
                        <span style={{
                          fontSize: "10px", padding: "2px 7px", borderRadius: "5px",
                          background: tierColor + "18", color: tierColor, fontWeight: 600,
                        }}>{key.tier}</span>
                      </div>
                      <div style={{ height: "4px", background: "var(--vael-border)", borderRadius: "2px", overflow: "hidden", marginBottom: "4px" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: tierColor, borderRadius: "2px" }} />
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--vael-text-3)" }}>
                        {formatNumber(usage)} / {formatNumber(key.usageLimit)} requests today
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Reset button */}
          <div style={{ marginTop: "24px", textAlign: "center" }}>
            <button
              onClick={() => { setData(null); setWallet(""); setApiKey(""); }}
              style={{
                background: "transparent", border: "1px solid var(--vael-border)",
                borderRadius: "8px", padding: "8px 20px",
                color: "var(--vael-text-3)", fontSize: "13px", cursor: "pointer",
              }}
            >
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
