"use client";
import { useState, useEffect } from "react";
import { GrowthChart }     from "@/components/GrowthChart";
import { ActionBreakdown } from "@/components/ActionBreakdown";
import { formatNumber }    from "@/lib/utils";

const DAYS_OPTIONS = [7, 14, 30, 90];

interface Summary {
  totalAgents:     number;
  totalActivities: number;
  activeAgents:    number;
  verifiedAgents:  number;
  avgReputation:   number;
  activeRate:      string;
}

interface TypeStat { agentType: string; count: number; percentage: string; }
interface RepBucket { bucket: string; count: number; }

const TYPE_COLORS = ["#7c6fff","#2dd4bf","#fbbf24","#4ade80","#f472b6","#60a5fa","#a78bfa","#f87171"];

export default function AnalyticsPage() {
  const [days,    setDays]    = useState(30);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [types,   setTypes]   = useState<TypeStat[]>([]);
  const [repDist, setRepDist] = useState<RepBucket[]>([]);
  const [loading, setLoading] = useState(true);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${apiUrl}/v1/analytics/summary`).then(r => r.json()),
      fetch(`${apiUrl}/v1/analytics/types`).then(r => r.json()),
      fetch(`${apiUrl}/v1/analytics/reputation`).then(r => r.json()),
    ])
      .then(([s, t, r]) => {
        setSummary(s.data);
        setTypes(t.data ?? []);
        setRepDist(r.data ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [apiUrl]);

  const maxRepCount = Math.max(...repDist.map(b => b.count), 1);

  return (
    <div style={{ animation: "fade-in 0.3s ease" }}>

      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 600, letterSpacing: "-0.8px", color: "var(--vael-text-1)", marginBottom: "6px" }}>
          Protocol Analytics
        </h1>
        <p style={{ fontSize: "14px", color: "var(--vael-text-3)" }}>
          Real-time metrics for the Vael agent infrastructure on Somnia.
        </p>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px", marginBottom: "28px" }}>
        {[
          { label: "Total Agents",      value: summary?.totalAgents,     color: "#7c6fff" },
          { label: "Total Activities",  value: summary?.totalActivities, color: "#2dd4bf" },
          { label: "Active Agents",     value: summary?.activeAgents,    color: "#4ade80", sub: `${summary?.activeRate ?? 0}% active` },
          { label: "Verified Agents",   value: summary?.verifiedAgents,  color: "#fbbf24" },
          { label: "Avg Reputation",    value: summary?.avgReputation,   color: "#f472b6", sub: "/ 1000" },
        ].map(card => (
          <div key={card.label} style={{
            background: "var(--vael-bg-card)", border: "1px solid var(--vael-border)",
            borderRadius: "12px", padding: "16px 18px",
          }}>
            <div style={{
              fontSize: "24px", fontWeight: 600, color: card.color,
              letterSpacing: "-0.5px", lineHeight: 1, marginBottom: "4px",
            }}>
              {loading ? "—" : formatNumber(card.value ?? 0)}
            </div>
            {card.sub && (
              <div style={{ fontSize: "11px", color: card.color, opacity: 0.7, marginBottom: "2px" }}>{card.sub}</div>
            )}
            <div style={{ fontSize: "11px", color: "var(--vael-text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {card.label}
            </div>
          </div>
        ))}
      </div>

      {/* Period selector */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        {DAYS_OPTIONS.map(d => (
          <button
            key={d}
            onClick={() => setDays(d)}
            style={{
              padding: "5px 14px", borderRadius: "7px", fontSize: "12px", cursor: "pointer",
              border:     days === d ? "1px solid #7c6fff" : "1px solid var(--vael-border)",
              background: days === d ? "rgba(124,111,255,0.12)" : "var(--vael-bg-card)",
              color:      days === d ? "#7c6fff" : "var(--vael-text-3)",
              transition: "all 0.15s",
            }}
          >{d}d</button>
        ))}
      </div>

      {/* Growth + Actions row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
        <GrowthChart days={days} />
        <ActionBreakdown />
      </div>

      {/* Types + Rep distribution row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

        {/* Agent type distribution */}
        <div style={{
          background: "var(--vael-bg-card)", border: "1px solid var(--vael-border)",
          borderRadius: "14px", padding: "20px",
        }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--vael-text-3)", marginBottom: "16px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Agent Types
          </div>

          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ height: "28px", marginBottom: "8px", borderRadius: "6px", background: "var(--vael-bg-hover)", animation: "pulse-soft 1.5s ease-in-out infinite" }} />
            ))
          ) : types.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--vael-text-3)", fontSize: "13px" }}>No data</div>
          ) : (
            <>
              {/* Donut-ish visual using stacked bar */}
              <div style={{ display: "flex", height: "10px", borderRadius: "6px", overflow: "hidden", marginBottom: "16px", gap: "2px" }}>
                {types.map((t, i) => (
                  <div key={t.agentType} style={{
                    flex:       parseFloat(t.percentage),
                    background: TYPE_COLORS[i % TYPE_COLORS.length],
                    borderRadius: i === 0 ? "6px 0 0 6px" : i === types.length - 1 ? "0 6px 6px 0" : 0,
                  }} />
                ))}
              </div>
              {types.map((t, i) => (
                <div key={t.agentType} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: TYPE_COLORS[i % TYPE_COLORS.length] }} />
                    <span style={{ fontSize: "13px", color: "var(--vael-text-1)" }}>{t.agentType}</span>
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <span style={{ fontSize: "12px", color: "var(--vael-text-3)" }}>{formatNumber(t.count)}</span>
                    <span style={{ fontSize: "12px", color: TYPE_COLORS[i % TYPE_COLORS.length], fontWeight: 600, minWidth: "38px", textAlign: "right" }}>
                      {parseFloat(t.percentage).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Reputation distribution */}
        <div style={{
          background: "var(--vael-bg-card)", border: "1px solid var(--vael-border)",
          borderRadius: "14px", padding: "20px",
        }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--vael-text-3)", marginBottom: "16px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Reputation Distribution
          </div>

          {loading ? (
            Array.from({ length: 10 }).map((_, i) => (
              <div key={i} style={{ height: "22px", marginBottom: "6px", borderRadius: "4px", background: "var(--vael-bg-hover)", animation: "pulse-soft 1.5s ease-in-out infinite" }} />
            ))
          ) : repDist.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--vael-text-3)", fontSize: "13px" }}>No data</div>
          ) : repDist.map((bucket, i) => {
            const pct   = (bucket.count / maxRepCount) * 100;
            const score = parseInt(bucket.bucket);
            const col   = score >= 800 ? "#fbbf24"
                        : score >= 500 ? "#7c6fff"
                        : score >= 200 ? "#2dd4bf"
                        : "#9090b0";
            return (
              <div key={bucket.bucket} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                <div style={{ fontSize: "11px", color: "var(--vael-text-3)", width: "32px", textAlign: "right", flexShrink: 0, fontFamily: "monospace" }}>
                  {bucket.bucket}
                </div>
                <div style={{ flex: 1, height: "16px", background: "var(--vael-border)", borderRadius: "3px", overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: `${pct}%`,
                    background: `linear-gradient(90deg, ${col}88, ${col})`,
                    borderRadius: "3px", transition: "width 0.6s ease",
                  }} />
                </div>
                <div style={{ fontSize: "11px", color: "var(--vael-text-3)", width: "28px", textAlign: "right", flexShrink: 0 }}>
                  {bucket.count}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
