"use client";
import { useWebSocket }              from "@/hooks/useWebSocket";
import { EVENT_ICONS, EVENT_COLORS } from "@/lib/types";
import { timeAgo, truncateAgentId }  from "@/lib/utils";
import Link                          from "next/link";

const STATUS_COLORS = {
  connected:    "#4ade80",
  connecting:   "#fbbf24",
  disconnected: "#9090b0",
  error:        "#f87171",
};

const STATUS_LABELS = {
  connected:    "Live",
  connecting:   "Connecting...",
  disconnected: "Disconnected",
  error:        "Error",
};

interface NotificationFeedProps {
  /** If provided, only shows events for these agents */
  agentIds?: string[];
  /** Max height before scrolling */
  maxHeight?: string;
  /** Show the connection status bar */
  showStatus?: boolean;
}

export function NotificationFeed({
  agentIds  = [],
  maxHeight = "480px",
  showStatus = true,
}: NotificationFeedProps) {
  const { status, events, stats, clearEvents } = useWebSocket({ agentIds });

  const statusColor = STATUS_COLORS[status];
  const statusLabel = STATUS_LABELS[status];

  return (
    <div style={{
      background:   "var(--vael-bg-card)",
      border:       "1px solid var(--vael-border)",
      borderRadius: "14px",
      overflow:     "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding:      "14px 18px",
        borderBottom: "1px solid var(--vael-border)",
        display:      "flex",
        alignItems:   "center",
        gap:          "10px",
      }}>
        {/* Live indicator */}
        <div style={{
          width:      "8px", height: "8px", borderRadius: "50%",
          background: statusColor,
          boxShadow:  status === "connected" ? `0 0 6px ${statusColor}88` : "none",
          animation:  status === "connected" ? "pulse-soft 1.5s ease-in-out infinite" : "none",
        }} />

        <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--vael-text-1)", flex: 1 }}>
          Live Event Feed
        </span>

        {showStatus && (
          <span style={{ fontSize: "11px", color: statusColor }}>{statusLabel}</span>
        )}

        {events.length > 0 && (
          <button
            onClick={clearEvents}
            style={{
              background: "transparent", border: "none",
              cursor: "pointer", fontSize: "11px",
              color: "var(--vael-text-3)", padding: "2px 6px",
            }}
          >Clear</button>
        )}
      </div>

      {/* Stats bar (shown when connected) */}
      {stats && status === "connected" && (
        <div style={{
          padding:      "8px 18px",
          borderBottom: "1px solid var(--vael-border)",
          display:      "flex", gap: "20px",
          background:   "rgba(74,222,128,0.03)",
        }}>
          {[
            { label: "Agents",     value: stats.totalAgents      },
            { label: "Activities", value: stats.totalActivities  },
            { label: "Passports",  value: stats.totalPassports   },
          ].map(s => (
            <div key={s.label} style={{ display: "flex", gap: "6px", alignItems: "baseline" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#4ade80" }}>
                {s.value?.toLocaleString() ?? "—"}
              </span>
              <span style={{ fontSize: "11px", color: "var(--vael-text-3)" }}>{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Events list */}
      <div style={{ maxHeight, overflowY: "auto" }}>
        {events.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center" }}>
            <div style={{ fontSize: "24px", marginBottom: "8px" }}>
              {status === "connected" ? "📡" : "🔌"}
            </div>
            <div style={{ fontSize: "13px", color: "var(--vael-text-2)", marginBottom: "4px" }}>
              {status === "connected" ? "Listening for events..." : statusLabel}
            </div>
            <div style={{ fontSize: "12px", color: "var(--vael-text-3)" }}>
              {status === "connected"
                ? "Events will appear here in real time as agents act on Somnia."
                : "Connect to see live agent events."}
            </div>
          </div>
        ) : events.map((event, i) => {
          const icon  = EVENT_ICONS[event.type]  ?? "•";
          const color = EVENT_COLORS[event.type] ?? "#9090b0";

          return (
            <div
              key={event.id || i}
              style={{
                padding:      "12px 18px",
                borderBottom: i < events.length - 1 ? "1px solid var(--vael-border)" : "none",
                display:      "flex", alignItems: "flex-start", gap: "12px",
                animation:    i === 0 ? "slide-up 0.2s ease" : "none",
              }}
            >
              {/* Icon */}
              <div style={{
                fontSize:    "16px", lineHeight: 1,
                paddingTop:  "2px", flexShrink: 0,
              }}>{icon}</div>

              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Event type */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                  <span style={{
                    fontSize:   "11px", padding: "2px 8px", borderRadius: "5px",
                    background: color + "18", color, fontWeight: 600,
                  }}>{event.type}</span>

                  {event.agentId && (
                    <Link
                      href={`/agents/${event.agentId}`}
                      style={{ fontSize: "11px", color: "var(--vael-text-3)", fontFamily: "monospace", textDecoration: "none" }}
                      onClick={e => e.stopPropagation()}
                    >
                      {truncateAgentId(event.agentId)}
                    </Link>
                  )}
                </div>

                {/* Event data summary */}
                <div style={{ fontSize: "12px", color: "var(--vael-text-2)", lineHeight: 1.4 }}>
                  {formatEventSummary(event)}
                </div>
              </div>

              {/* Timestamp */}
              <div style={{ fontSize: "11px", color: "var(--vael-text-3)", flexShrink: 0, paddingTop: "3px" }}>
                {timeAgo(event.timestamp)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatEventSummary(event: any): string {
  const d = event.data ?? {};
  switch (event.type) {
    case "agent.registered":    return `New ${d.agentType ?? ""} agent registered`;
    case "activity.logged":     return `Action: ${d.action ?? "unknown"}`;
    case "reputation.updated":  return `Score updated to ${d.newScore ?? "?"}`;
    case "stake.placed":        return `${formatSTT(d.amount)} STT staked`;
    case "task.posted":         return `Task: "${d.title ?? "Untitled"}" — ${formatSTT(d.reward)} STT`;
    case "task.assigned":       return `Worker assigned`;
    case "task.settled":        return `${formatSTT(d.reward)} STT released to worker`;
    case "condition.triggered": return `Condition fired: ${d.actionTag ?? ""}`;
    case "memory.set":          return `Key "${d.key ?? ""}" updated`;
    default:                    return JSON.stringify(d).slice(0, 80);
  }
}

function formatSTT(wei: unknown): string {
  if (!wei) return "?";
  return (Number(wei) / 1e18).toFixed(3);
}
