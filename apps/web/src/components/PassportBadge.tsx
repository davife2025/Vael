"use client";
import type { PassportData } from "@/lib/api";
import { getReputationColor, getReputationTier, getReputationLabel, formatDateTime } from "@/lib/utils";

interface PassportBadgeProps { passport: PassportData | null; loading?: boolean; }

export function PassportBadge({ passport, loading }: PassportBadgeProps) {
  if (loading) return (
    <div style={{
      background: "var(--vael-bg-card)", border: "1px solid var(--vael-border)",
      borderRadius: "14px", padding: "24px", height: "180px",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{ color: "var(--vael-text-3)", fontSize: "13px" }}>Loading passport...</div>
    </div>
  );

  if (!passport) return (
    <div style={{
      background: "var(--vael-bg-card)", border: "1px solid var(--vael-border)",
      borderRadius: "14px", padding: "24px",
      display: "flex", flexDirection: "column", alignItems: "center", gap: "8px",
    }}>
      <div style={{ fontSize: "28px" }}>🪪</div>
      <div style={{ fontSize: "14px", color: "var(--vael-text-2)", fontWeight: 500 }}>No Passport</div>
      <div style={{ fontSize: "12px", color: "var(--vael-text-3)", textAlign: "center" }}>
        This agent has not been issued a Vael Passport yet.
      </div>
    </div>
  );

  const score   = Number(passport.reputationScore);
  const pct     = Math.min((score / 1000) * 100, 100);
  const color   = getReputationColor(score);
  const tier    = getReputationTier(score);
  const label   = getReputationLabel(score);

  return (
    <div style={{
      background:   "var(--vael-bg-card)",
      border:       `1px solid ${color}44`,
      borderRadius: "14px", padding: "24px",
      position:     "relative", overflow: "hidden",
    }}>
      {/* Glow background */}
      <div style={{
        position: "absolute", top: 0, right: 0,
        width: "120px", height: "120px",
        background: `radial-gradient(circle, ${color}15 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <div style={{ fontSize: "12px", color: "var(--vael-text-3)", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Vael Passport
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {passport.verified && (
            <span style={{
              fontSize: "11px", padding: "2px 8px", borderRadius: "6px",
              background: "rgba(124,111,255,0.15)", color: "var(--vael-purple)", fontWeight: 600,
            }}>✓ Verified</span>
          )}
          <span style={{
            fontSize: "11px", padding: "2px 8px", borderRadius: "6px",
            background: color + "20", color, fontWeight: 600,
          }}>{label}</span>
        </div>
      </div>

      {/* Score */}
      <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginBottom: "10px" }}>
        <span style={{ fontSize: "42px", fontWeight: 600, color, lineHeight: 1, letterSpacing: "-2px" }}>
          {score}
        </span>
        <span style={{ fontSize: "16px", color: "var(--vael-text-3)" }}>/1000</span>
      </div>

      {/* Progress bar */}
      <div style={{
        height: "6px", background: "var(--vael-border)", borderRadius: "3px",
        marginBottom: "16px", overflow: "hidden",
      }}>
        <div style={{
          height: "100%", width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          borderRadius: "3px", transition: "width 0.6s ease",
        }} />
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: "16px" }}>
        <div>
          <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--vael-text-1)" }}>
            #{passport.tokenId}
          </div>
          <div style={{ fontSize: "11px", color: "var(--vael-text-3)" }}>Token ID</div>
        </div>
        <div>
          <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--vael-text-1)" }}>
            {passport.totalActions}
          </div>
          <div style={{ fontSize: "11px", color: "var(--vael-text-3)" }}>Actions</div>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div style={{ fontSize: "12px", color: "var(--vael-text-3)" }}>
            Issued {formatDateTime(passport.issuedAt)}
          </div>
        </div>
      </div>
    </div>
  );
}
