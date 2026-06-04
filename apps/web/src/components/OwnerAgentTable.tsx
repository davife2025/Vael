"use client";
import Link from "next/link";
import {
  truncateAgentId, truncateAddress, timeAgo,
  getAgentTypeColor, getReputationColor, formatNumber,
} from "@/lib/utils";

interface Agent {
  id:              string;
  agentType:       string;
  name?:           string;
  active:          boolean;
  reputationScore: number;
  totalActivities: number;
  lastActivityAt?: string;
  createdAt:       string;
}

interface OwnerAgentTableProps {
  agents:  Agent[];
  loading: boolean;
}

export function OwnerAgentTable({ agents, loading }: OwnerAgentTableProps) {
  if (loading) return (
    <div style={{
      background: "var(--vael-bg-card)", border: "1px solid var(--vael-border)",
      borderRadius: "14px", overflow: "hidden",
    }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ height: "56px", margin: "4px 16px", borderRadius: "8px", background: "var(--vael-bg-hover)", animation: "pulse-soft 1.5s ease-in-out infinite" }} />
      ))}
    </div>
  );

  if (agents.length === 0) return (
    <div style={{
      background: "var(--vael-bg-card)", border: "1px solid var(--vael-border)",
      borderRadius: "14px", padding: "40px", textAlign: "center",
    }}>
      <div style={{ fontSize: "28px", marginBottom: "10px" }}>🤖</div>
      <div style={{ fontSize: "14px", color: "var(--vael-text-2)", marginBottom: "4px" }}>No agents yet</div>
      <div style={{ fontSize: "12px", color: "var(--vael-text-3)" }}>
        Register your first agent using the <code style={{ fontFamily: "monospace" }}>@vael/sdk</code>.
      </div>
    </div>
  );

  return (
    <div style={{
      background: "var(--vael-bg-card)", border: "1px solid var(--vael-border)",
      borderRadius: "14px", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 100px 100px 100px 120px",
        padding: "10px 18px", borderBottom: "1px solid var(--vael-border)",
        fontSize: "11px", color: "var(--vael-text-3)", letterSpacing: "0.05em", textTransform: "uppercase",
      }}>
        <div>Agent</div>
        <div style={{ textAlign: "right" }}>Reputation</div>
        <div style={{ textAlign: "right" }}>Actions</div>
        <div style={{ textAlign: "right" }}>Status</div>
        <div style={{ textAlign: "right" }}>Last Active</div>
      </div>

      {/* Rows */}
      {agents.map((agent, i) => {
        const typeColor  = getAgentTypeColor(agent.agentType);
        const repColor   = getReputationColor(agent.reputationScore);

        return (
          <Link key={agent.id} href={`/agents/${agent.id}`} style={{ textDecoration: "none" }}>
            <div
              style={{
                display: "grid", gridTemplateColumns: "1fr 100px 100px 100px 120px",
                padding: "14px 18px", alignItems: "center",
                borderBottom: i < agents.length - 1 ? "1px solid var(--vael-border)" : "none",
                cursor: "pointer", transition: "background 0.1s",
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "var(--vael-bg-hover)")}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
            >
              {/* Agent name + type */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                <div style={{
                  width: "32px", height: "32px", borderRadius: "8px", flexShrink: 0,
                  background: typeColor + "18", border: `1px solid ${typeColor}33`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "13px", fontWeight: 700, color: typeColor,
                }}>
                  {(agent.agentType || "?")[0].toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--vael-text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {agent.name || truncateAgentId(agent.id)}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--vael-text-3)" }}>{agent.agentType}</div>
                </div>
              </div>

              {/* Reputation */}
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "14px", fontWeight: 600, color: repColor }}>
                  {agent.reputationScore}
                </span>
                <span style={{ fontSize: "11px", color: "var(--vael-text-3)" }}>/1000</span>
              </div>

              {/* Activities */}
              <div style={{ textAlign: "right", fontSize: "13px", color: "var(--vael-text-2)" }}>
                {formatNumber(agent.totalActivities)}
              </div>

              {/* Status */}
              <div style={{ textAlign: "right" }}>
                <span style={{
                  fontSize: "11px", padding: "3px 8px", borderRadius: "6px",
                  background: agent.active ? "rgba(74,222,128,0.1)" : "rgba(90,90,120,0.15)",
                  color: agent.active ? "#4ade80" : "var(--vael-text-3)", fontWeight: 500,
                }}>
                  {agent.active ? "Active" : "Inactive"}
                </span>
              </div>

              {/* Last active */}
              <div style={{ textAlign: "right", fontSize: "12px", color: "var(--vael-text-3)" }}>
                {agent.lastActivityAt ? timeAgo(agent.lastActivityAt) : timeAgo(agent.createdAt)}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
