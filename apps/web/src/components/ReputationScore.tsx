"use client";
import { useState, useEffect } from "react";
import { getReputationColor } from "@/lib/utils";

interface ReputationFactors {
  total:         number;
  activityScore: number;
  ageScore:      number;
  stakeScore:    number;
  communityScore:number;
  lastComputed:  string;
}

interface ReputationScoreProps { agentId: string; }

function FactorBar({
  label, score, max, color,
}: { label: string; score: number; max: number; color: string }) {
  const pct = Math.min((score / max) * 100, 100);
  return (
    <div style={{ marginBottom: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
        <span style={{ fontSize: "12px", color: "var(--vael-text-2)" }}>{label}</span>
        <span style={{ fontSize: "12px", color, fontWeight: 600, fontFamily: "monospace" }}>
          {score}<span style={{ color: "var(--vael-text-3)", fontWeight: 400 }}>/{max}</span>
        </span>
      </div>
      <div style={{ height: "5px", background: "var(--vael-border)", borderRadius: "3px", overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}66, ${color})`,
          borderRadius: "3px", transition: "width 0.8s ease",
        }} />
      </div>
    </div>
  );
}

export function ReputationScore({ agentId }: ReputationScoreProps) {
  const [factors, setFactors] = useState<ReputationFactors | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    fetch(`${apiUrl}/v1/reputation/${agentId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setFactors(d?.data ?? null))
      .catch(() => setFactors(null))
      .finally(() => setLoading(false));
  }, [agentId]);

  if (loading) return (
    <div style={{
      background: "var(--vael-bg-card)", border: "1px solid var(--vael-border)",
      borderRadius: "12px", padding: "20px",
      animation: "pulse-soft 1.5s ease-in-out infinite", height: "180px",
    }} />
  );

  if (!factors) return null;

  const color = getReputationColor(factors.total);

  return (
    <div style={{
      background: "var(--vael-bg-card)", border: "1px solid var(--vael-border)",
      borderRadius: "12px", padding: "20px",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
        <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--vael-text-3)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Score Breakdown
        </div>
        <div style={{ fontSize: "20px", fontWeight: 600, color, letterSpacing: "-0.5px" }}>
          {factors.total}<span style={{ fontSize: "12px", color: "var(--vael-text-3)", fontWeight: 400 }}>/'1000'</span>
        </div>
      </div>

      <FactorBar label="Activity"  score={factors.activityScore}  max={300} color="#2dd4bf" />
      <FactorBar label="Age"       score={factors.ageScore}       max={200} color="#60a5fa" />
      <FactorBar label="Stake"     score={factors.stakeScore}     max={300} color="#7c6fff" />
      <FactorBar label="Community" score={factors.communityScore} max={200} color="#fbbf24" />

      <div style={{ fontSize: "11px", color: "var(--vael-text-3)", marginTop: "12px", textAlign: "right" }}>
        Last computed {new Date(factors.lastComputed).toLocaleTimeString()}
      </div>
    </div>
  );
}
