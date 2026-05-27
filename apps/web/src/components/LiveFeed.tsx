"use client";
import Link from "next/link";
import { useLiveFeed } from "@/hooks/useVael";
import { truncateAgentId, truncateAddress, timeAgo, getAgentTypeColor } from "@/lib/utils";

export function LiveFeed() {
  const { agents, activities, loading, refresh } = useLiveFeed(6);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

      {/* New agents */}
      <div style={{
        background: "var(--vael-bg-card)", border: "1px solid var(--vael-border)",
        borderRadius: "14px", overflow: "hidden",
      }}>
        <div style={{
          padding: "14px 18px",
          borderBottom: "1px solid var(--vael-border)",
          display: "flex", alignItems: "center", gap: "8px",
        }}>
          <div className="live-dot" />
          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--vael-text-1)" }}>
            New Agents
          </span>
          <button
            onClick={refresh}
            style={{
              marginLeft: "auto", background: "transparent", border: "none",
              cursor: "pointer", color: "var(--vael-text-3)", fontSize: "12px",
            }}
          >↻ Refresh</button>
        </div>

        <div>
          {loading && agents.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "var(--vael-text-3)", fontSize: "13px" }}>
              Loading...
            </div>
          ) : agents.map((agent, i) => {
            const color = getAgentTypeColor(agent.agentType);
            return (
              <Link key={agent.id} href={`/agents/${agent.id}`} style={{ textDecoration: "none" }}>
                <div
                  style={{
                    padding: "12px 18px",
                    borderBottom: i < agents.length - 1 ? "1px solid var(--vael-border)" : "none",
                    display: "flex", alignItems: "center", gap: "10px",
                    transition: "background 0.1s", cursor: "pointer",
                  }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "var(--vael-bg-hover)")}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                >
                  <div style={{
                    width: "28px", height: "28px", borderRadius: "7px", flexShrink: 0,
                    background: color + "18", border: `1px solid ${color}33`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "12px", fontWeight: 700, color,
                  }}>
                    {(agent.agentType || "?")[0].toUpperCase()}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: "13px", color: "var(--vael-text-1)", fontWeight: 500,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {agent.name || truncateAgentId(agent.id)}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--vael-text-3)", fontFamily: "monospace" }}>
                      {truncateAddress(agent.owner)}
                    </div>
                  </div>

                  <div style={{ fontSize: "11px", color: "var(--vael-text-3)", flexShrink: 0 }}>
                 {timeAgo(Date.parse(agent.createdAt))}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent activity */}
      <div style={{
        background: "var(--vael-bg-card)", border: "1px solid var(--vael-border)",
        borderRadius: "14px", overflow: "hidden",
      }}>
        <div style={{
          padding: "14px 18px",
          borderBottom: "1px solid var(--vael-border)",
          display: "flex", alignItems: "center", gap: "8px",
        }}>
          <div className="live-dot" />
          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--vael-text-1)" }}>
            Recent Activity
          </span>
        </div>

        <div>
          {loading && activities.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "var(--vael-text-3)", fontSize: "13px" }}>
              Loading...
            </div>
          ) : activities.map((act, i) => (
            <div
              key={act.id}
              style={{
                padding: "12px 18px",
                borderBottom: i < activities.length - 1 ? "1px solid var(--vael-border)" : "none",
                display: "flex", alignItems: "center", gap: "10px",
              }}
            >
              <div style={{
                fontSize: "11px", padding: "3px 8px", borderRadius: "6px", fontWeight: 600,
                background: "rgba(124,111,255,0.12)", color: "var(--vael-purple)", flexShrink: 0,
              }}>
                {act.action}
              </div>

              {act.agent && (
                <Link href={`/agents/${act.agent.id}`} style={{
                  fontSize: "12px", color: "var(--vael-text-2)", textDecoration: "none",
                  fontFamily: "monospace", flex: 1, minWidth: 0,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {truncateAgentId(act.agent.id)}
                </Link>
              )}

              <div style={{ fontSize: "11px", color: "var(--vael-text-3)", flexShrink: 0 }}>
                {timeAgo(new Date(act.timestamp).getTime())}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
