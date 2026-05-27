"use client";
import Link from "next/link";
import type { AgentSummary } from "@/lib/api";
import {
  truncateAddress, truncateAgentId, timeAgo,
  getAgentTypeColor, getReputationColor, getReputationLabel, formatNumber,
} from "@/lib/utils";

interface AgentCardProps { agent: AgentSummary; }

export function AgentCard({ agent }: AgentCardProps) {
  const typeColor  = getAgentTypeColor(agent.agentType);
  const repScore   = Number(agent.passport?.reputationScore ?? 0);
  const repColor   = getReputationColor(repScore);
  const repLabel   = getReputationLabel(repScore);
  const activities = formatNumber(Number(agent.totalActivities ?? 0));

  return (
    <Link href={`/agents/${agent.id}`} style={{ textDecoration: "none" }}>
      <div
        style={{
          background:   "var(--vael-bg-card)",
          border:       "1px solid var(--vael-border)",
          borderRadius: "14px",
          padding:      "20px",
          cursor:       "pointer",
          transition:   "border-color 0.15s, transform 0.15s",
          display:      "flex", flexDirection: "column", gap: "14px",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.borderColor = "var(--vael-border-soft)";
          (e.currentTarget as HTMLElement).style.transform   = "translateY(-1px)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.borderColor = "var(--vael-border)";
          (e.currentTarget as HTMLElement).style.transform   = "translateY(0)";
        }}
      >
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
          {/* Type icon */}
          <div style={{
            width: "40px", height: "40px", borderRadius: "10px", flexShrink: 0,
            background: typeColor + "18",
            border:     `1px solid ${typeColor}33`,
            display:    "flex", alignItems: "center", justifyContent: "center",
            fontSize:   "16px", fontWeight: 700, color: typeColor,
          }}>
            {(agent.agentType || "?")[0].toUpperCase()}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: "15px", fontWeight: 600,
              color: "var(--vael-text-1)", lineHeight: 1.2,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {agent.name || truncateAgentId(agent.id)}
            </div>
            <div style={{
              fontSize: "12px", color: "var(--vael-text-3)",
              fontFamily: "monospace", marginTop: "2px",
            }}>
              {truncateAddress(agent.owner)}
            </div>
          </div>

          {/* Active badge */}
          <div style={{
            width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0, marginTop: "4px",
            background: agent.active ? "var(--vael-green)" : "var(--vael-text-3)",
          }} title={agent.active ? "Active" : "Inactive"} />
        </div>

        {/* Description */}
        {agent.description && (
          <div style={{
            fontSize: "13px", color: "var(--vael-text-2)",
            lineHeight: 1.5, display: "-webkit-box",
            WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            {agent.description}
          </div>
        )}

        {/* Footer row */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          {/* Type tag */}
          <span style={{
            fontSize: "11px", padding: "3px 8px", borderRadius: "6px",
            background: typeColor + "18", color: typeColor, fontWeight: 500,
          }}>
            {agent.agentType}
          </span>

          {/* Reputation */}
          {repScore > 0 && (
            <span style={{
              fontSize: "11px", padding: "3px 8px", borderRadius: "6px",
              background: repColor + "18", color: repColor, fontWeight: 500,
            }}>
              {repLabel} · {repScore}
            </span>
          )}

          {/* Verified badge */}
          {agent.passport?.verified && (
            <span style={{
              fontSize: "11px", padding: "3px 8px", borderRadius: "6px",
              background: "rgba(124,111,255,0.15)", color: "var(--vael-purple)", fontWeight: 500,
            }}>
              ✓ Verified
            </span>
          )}

          {/* Activity count */}
          <span style={{ fontSize: "11px", color: "var(--vael-text-3)", marginLeft: "auto" }}>
     {agent.lastActivityAt ? timeAgo(new Date(agent.lastActivityAt).getTime()) : timeAgo(new Date(agent.createdAt).getTime())}
          </span>
        </div>
      </div>
    </Link>
  );
}
