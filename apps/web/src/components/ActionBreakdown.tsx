"use client";
import { useState, useEffect } from "react";
import { formatNumber } from "@/lib/utils";

const ACTION_COLORS: Record<string, string> = {
  transfer:  "#2dd4bf",
  trade:     "#7c6fff",
  swap:      "#7c6fff",
  vote:      "#60a5fa",
  stake:     "#fbbf24",
  unstake:   "#fbbf24",
  message:   "#4ade80",
  execute:   "#f472b6",
  delegate:  "#a78bfa",
  heartbeat: "#9090b0",
  custom:    "#5a5a78",
};

function color(action: string) {
  return ACTION_COLORS[action?.toLowerCase()] ?? "#9090b0";
}

interface ActionStat { action: string; count: number; percentage: string; }

export function ActionBreakdown() {
  const [data,    setData]   = useState<ActionStat[]>([]);
  const [loading, setLoading]= useState(true);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  useEffect(() => {
    fetch(`${apiUrl}/v1/analytics/actions`)
      .then(r => r.json())
      .then(d => setData(d.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [apiUrl]);

  return (
    <div style={{
      background: "var(--vael-bg-card)", border: "1px solid var(--vael-border)",
      borderRadius: "14px", padding: "20px",
    }}>
      <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--vael-text-3)", marginBottom: "16px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
        Action Breakdown
      </div>

      {loading ? (
        Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ height: "32px", marginBottom: "8px", borderRadius: "6px", background: "var(--vael-bg-hover)", animation: "pulse-soft 1.5s ease-in-out infinite" }} />
        ))
      ) : data.length === 0 ? (
        <div style={{ textAlign: "center", color: "var(--vael-text-3)", fontSize: "13px", padding: "20px 0" }}>
          No activity data yet
        </div>
      ) : data.map((item, i) => {
        const c   = color(item.action);
        const pct = parseFloat(item.percentage);
        return (
          <div key={item.action} style={{ marginBottom: i < data.length - 1 ? "10px" : 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: c }} />
                <span style={{ fontSize: "13px", color: "var(--vael-text-1)", fontWeight: 500 }}>{item.action}</span>
              </div>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <span style={{ fontSize: "12px", color: "var(--vael-text-3)" }}>{formatNumber(item.count)}</span>
                <span style={{ fontSize: "12px", color: c, fontWeight: 600, minWidth: "42px", textAlign: "right" }}>{pct.toFixed(1)}%</span>
              </div>
            </div>
            <div style={{ height: "5px", background: "var(--vael-border)", borderRadius: "3px", overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${pct}%`,
                background: `linear-gradient(90deg, ${c}88, ${c})`,
                borderRadius: "3px", transition: "width 0.6s ease",
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
