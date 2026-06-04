"use client";
import { useState, useEffect } from "react";
import { formatNumber } from "@/lib/utils";

interface DayStat {
  date:            number;
  newAgents:       number;
  totalAgents:     number;
  newActivities:   number;
  totalActivities: number;
}

interface GrowthChartProps { days?: number; }

function Sparkline({
  data, color, width = 400, height = 80,
}: { data: number[]; color: string; width?: number; height?: number }) {
  if (!data.length) return null;
  const max    = Math.max(...data, 1);
  const min    = Math.min(...data, 0);
  const range  = max - min || 1;
  const padX   = 2;
  const stepX  = (width - padX * 2) / Math.max(data.length - 1, 1);

  const points = data.map((v, i) => {
    const x = padX + i * stepX;
    const y = height - ((v - min) / range) * (height - 8) - 4;
    return `${x},${y}`;
  });

  const pathD   = `M ${points.join(" L ")}`;
  const areaD   = `M ${padX},${height} L ${points.join(" L ")} L ${padX + (data.length - 1) * stepX},${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#grad-${color.replace("#", "")})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Last point dot */}
      {data.length > 0 && (
        <circle
          cx={padX + (data.length - 1) * stepX}
          cy={height - ((data[data.length - 1] - min) / range) * (height - 8) - 4}
          r="3" fill={color}
        />
      )}
    </svg>
  );
}

export function GrowthChart({ days = 30 }: GrowthChartProps) {
  const [data,   setData]   = useState<DayStat[]>([]);
  const [metric, setMetric] = useState<"agents" | "activities">("agents");
  const [loading,setLoading]= useState(true);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  useEffect(() => {
    setLoading(true);
    fetch(`${apiUrl}/v1/analytics/growth?days=${days}`)
      .then(r => r.json())
      .then(d => setData(d.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [days, apiUrl]);

  const totalValues = metric === "agents"
    ? data.map(d => d.totalAgents)
    : data.map(d => d.totalActivities);

  const newValues = metric === "agents"
    ? data.map(d => d.newAgents)
    : data.map(d => d.newActivities);

  const color      = metric === "agents" ? "#7c6fff" : "#2dd4bf";
  const lastTotal  = totalValues[totalValues.length - 1] ?? 0;
  const lastNew    = newValues[newValues.length - 1] ?? 0;
  const growth     = totalValues.length >= 2
    ? ((lastTotal - (totalValues[totalValues.length - 7] ?? lastTotal)) / (totalValues[totalValues.length - 7] ?? 1) * 100).toFixed(1)
    : "0";

  return (
    <div style={{
      background: "var(--vael-bg-card)", border: "1px solid var(--vael-border)",
      borderRadius: "14px", padding: "20px", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px" }}>
        <div>
          <div style={{ fontSize: "12px", color: "var(--vael-text-3)", marginBottom: "4px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            {metric === "agents" ? "Agent Growth" : "Activity Volume"}
          </div>
          <div style={{ fontSize: "32px", fontWeight: 600, color, letterSpacing: "-1px", lineHeight: 1 }}>
            {formatNumber(lastTotal)}
          </div>
          <div style={{ fontSize: "12px", color: Number(growth) >= 0 ? "#4ade80" : "#f87171", marginTop: "4px" }}>
            {Number(growth) >= 0 ? "+" : ""}{growth}% vs 7d ago
          </div>
        </div>

        {/* Toggle */}
        <div style={{ display: "flex", gap: "6px" }}>
          {(["agents", "activities"] as const).map(m => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              style={{
                padding: "5px 12px", borderRadius: "7px", fontSize: "12px", cursor: "pointer",
                border:     metric === m ? `1px solid ${color}` : "1px solid var(--vael-border)",
                background: metric === m ? `${color}18` : "var(--vael-bg-card)",
                color:      metric === m ? color : "var(--vael-text-3)",
                fontWeight: metric === m ? 600 : 400,
                transition: "all 0.15s",
              }}
            >{m}</button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {loading ? (
        <div style={{ height: "80px", background: "var(--vael-bg-hover)", borderRadius: "8px", animation: "pulse-soft 1.5s ease-in-out infinite" }} />
      ) : (
        <div style={{ width: "100%", overflow: "hidden" }}>
          <Sparkline data={totalValues} color={color} width={560} height={80} />
        </div>
      )}

      {/* Footer stats */}
      <div style={{ display: "flex", gap: "20px", marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--vael-border)" }}>
        <div>
          <div style={{ fontSize: "11px", color: "var(--vael-text-3)" }}>Today</div>
          <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--vael-text-1)" }}>+{formatNumber(lastNew)}</div>
        </div>
        <div>
          <div style={{ fontSize: "11px", color: "var(--vael-text-3)" }}>Period</div>
          <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--vael-text-1)" }}>{days}d</div>
        </div>
        <div>
          <div style={{ fontSize: "11px", color: "var(--vael-text-3)" }}>Avg/day</div>
          <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--vael-text-1)" }}>
            {data.length ? formatNumber(Math.round(newValues.reduce((s, v) => s + v, 0) / data.length)) : "—"}
          </div>
        </div>
      </div>
    </div>
  );
}
