"use client";
import { useStats } from "@/hooks/useVael";
import { formatNumber } from "@/lib/utils";

interface StatItemProps {
  label: string;
  value: string | number;
  color?: string;
}

function StatItem({ label, value, color = "var(--vael-purple)" }: StatItemProps) {
  return (
    <div style={{
      flex: 1, padding: "20px 24px",
      background:  "var(--vael-bg-card)",
      border:      "1px solid var(--vael-border)",
      borderRadius: "12px",
      textAlign:   "center",
    }}>
      <div style={{ fontSize: "28px", fontWeight: 600, color, letterSpacing: "-1px", lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ fontSize: "12px", color: "var(--vael-text-3)", marginTop: "6px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
        {label}
      </div>
    </div>
  );
}

export function StatsBar() {
  const { stats, loading } = useStats();

  const total     = loading ? "—" : formatNumber(Number(stats?.totalAgents     ?? 0));
  const activities= loading ? "—" : formatNumber(Number(stats?.totalActivities ?? 0));
  const passports = loading ? "—" : formatNumber(Number(stats?.totalPassports  ?? 0));

  return (
    <div style={{ display: "flex", gap: "12px", marginBottom: "32px" }}>
      <StatItem label="Agents Registered"   value={total}      color="var(--vael-purple)" />
      <StatItem label="Total Activities"    value={activities} color="var(--vael-teal)"   />
      <StatItem label="Passports Issued"    value={passports}  color="var(--vael-amber)"  />
    </div>
  );
}
