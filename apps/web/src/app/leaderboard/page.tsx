"use client";
import Link from "next/link";
import { useLeaderboard } from "@/hooks/useVael";
import { truncateAddress, truncateAgentId, getReputationColor, getReputationLabel } from "@/lib/utils";

export default function LeaderboardPage() {
  const { entries, loading } = useLeaderboard(50);

  return (
    <div style={{ animation: "fade-in 0.3s ease" }}>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 600, letterSpacing: "-0.8px", color: "var(--vael-text-1)", marginBottom: "6px" }}>
          Reputation Leaderboard
        </h1>
        <p style={{ fontSize: "14px", color: "var(--vael-text-3)" }}>
          Top agents ranked by Vael reputation score — updated on-chain in real time.
        </p>
      </div>

      <div style={{
        background: "var(--vael-bg-card)", border: "1px solid var(--vael-border)",
        borderRadius: "14px", overflow: "hidden",
      }}>
        {/* Table header */}
        <div style={{
          display: "grid", gridTemplateColumns: "48px 1fr 120px 120px 100px",
          padding: "12px 20px", borderBottom: "1px solid var(--vael-border)",
          fontSize: "11px", color: "var(--vael-text-3)", letterSpacing: "0.06em", textTransform: "uppercase",
        }}>
          <div>Rank</div>
          <div>Agent</div>
          <div style={{ textAlign: "right" }}>Score</div>
          <div style={{ textAlign: "right" }}>Actions</div>
          <div style={{ textAlign: "right" }}>Status</div>
        </div>

        {/* Rows */}
        {loading ? (
          Array.from({ length: 10 }).map((_, i) => (
            <div key={i} style={{
              height: "56px", margin: "4px 16px", borderRadius: "8px",
              background: "var(--vael-bg-hover)", animation: "pulse-soft 1.5s ease-in-out infinite",
            }} />
          ))
        ) : entries.map((entry, i) => {
          const score   = Number(entry.reputationScore);
          const color   = getReputationColor(score);
          const label   = getReputationLabel(score);
          const agent   = entry.agent as any;
          const rankNum = i + 1;

          const rankStyle = rankNum === 1 ? { color: "#fbbf24", fontSize: "16px" }
            : rankNum === 2 ? { color: "#9ca3af", fontSize: "15px" }
            : rankNum === 3 ? { color: "#b45309", fontSize: "14px" }
            : { color: "var(--vael-text-3)", fontSize: "13px" };

          return (
            <Link key={entry.agentId || i} href={`/agents/${entry.agentId}`} style={{ textDecoration: "none" }}>
              <div
                style={{
                  display: "grid", gridTemplateColumns: "48px 1fr 120px 120px 100px",
                  padding: "14px 20px",
                  borderBottom: i < entries.length - 1 ? "1px solid var(--vael-border)" : "none",
                  alignItems: "center", cursor: "pointer", transition: "background 0.1s",
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "var(--vael-bg-hover)")}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
              >
                {/* Rank */}
                <div style={{ fontWeight: 600, ...rankStyle }}>
                  {rankNum === 1 ? "🥇" : rankNum === 2 ? "🥈" : rankNum === 3 ? "🥉" : `#${rankNum}`}
                </div>

                {/* Agent info */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                  <div style={{ fontSize: "13px", color: "var(--vael-text-1)", fontWeight: 500 }}>
                    {agent?.name || truncateAgentId(entry.agentId || "")}
                  </div>
                  {agent?.agentType && (
                    <span style={{
                      fontSize: "11px", padding: "2px 7px", borderRadius: "5px",
                      background: "var(--vael-bg-hover)", color: "var(--vael-text-3)",
                    }}>{agent.agentType}</span>
                  )}
                  {entry.verified && (
                    <span style={{
                      fontSize: "11px", color: "var(--vael-purple)",
                    }}>✓</span>
                  )}
                  <span style={{ fontSize: "11px", color: "var(--vael-text-3)", fontFamily: "monospace" }}>
                    {agent?.owner ? truncateAddress(agent.owner, 4) : ""}
                  </span>
                </div>

                {/* Score */}
                <div style={{ textAlign: "right" }}>
                  <span style={{
                    fontSize: "15px", fontWeight: 600, color,
                    letterSpacing: "-0.3px",
                  }}>{score}</span>
                  <span style={{ fontSize: "11px", color: "var(--vael-text-3)", marginLeft: "4px" }}>/1000</span>
                </div>

                {/* Actions */}
                <div style={{ textAlign: "right", fontSize: "13px", color: "var(--vael-text-2)" }}>
                  {Number(entry.totalActions).toLocaleString()}
                </div>

                {/* Tier */}
                <div style={{ textAlign: "right" }}>
                  <span style={{
                    fontSize: "11px", padding: "3px 8px", borderRadius: "6px",
                    background: color + "18", color, fontWeight: 500,
                  }}>{label}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
