"use client";
import { useState, useEffect } from "react";
import { formatDateTime, timeAgo } from "@/lib/utils";

const COND_STATUS_COLORS: Record<string, string> = {
  ACTIVE:    "#4ade80",
  PAUSED:    "#fbbf24",
  TRIGGERED: "#7c6fff",
  EXPIRED:   "#5a5a78",
  CANCELLED: "#f87171",
};

const COND_TYPE_LABELS: Record<number, string> = {
  0: "Price Threshold",
  1: "Time Interval",
  2: "Ledger Count",
  3: "Balance Change",
  4: "Custom",
};

interface MemoryEntry {
  key:       string;
  value:     string;
  updatedAt: string;
  version:   string;
}

interface Condition {
  conditionId:  string;
  name:         string;
  condType:     number;
  actionTag:    string;
  maxTriggers:  string;
  triggerCount: string;
  lastTriggered:string;
  status:       string;
  createdAt:    string;
}

interface AgentMemoryPanelProps { agentId: string; }

export function AgentMemoryPanel({ agentId }: AgentMemoryPanelProps) {
  const [tab,        setTab]       = useState<"memory" | "conditions">("memory");
  const [entries,    setEntries]   = useState<MemoryEntry[]>([]);
  const [conditions, setConditions]= useState<Condition[]>([]);
  const [loading,    setLoading]   = useState(true);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${apiUrl}/v1/memory/${agentId}`).then(r => r.json()),
      fetch(`${apiUrl}/v1/memory/${agentId}/conditions`).then(r => r.json()),
    ])
      .then(([mem, cond]) => {
        setEntries(mem.data?.entries ?? []);
        setConditions(cond.data ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [agentId, apiUrl]);

  return (
    <div style={{
      background: "var(--vael-bg-card)", border: "1px solid var(--vael-border)",
      borderRadius: "14px", overflow: "hidden",
    }}>
      {/* Tab bar */}
      <div style={{
        display: "flex", borderBottom: "1px solid var(--vael-border)",
        padding: "0 4px",
      }}>
        {(["memory", "conditions"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "12px 18px", background: "transparent", border: "none",
              cursor: "pointer", fontSize: "13px", fontWeight: tab === t ? 600 : 400,
              color:  tab === t ? "var(--vael-text-1)" : "var(--vael-text-3)",
              borderBottom: tab === t ? "2px solid var(--vael-purple)" : "2px solid transparent",
              transition: "all 0.15s",
            }}
          >
            {t === "memory" ? `Memory (${entries.length})` : `Conditions (${conditions.length})`}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "4px 0" }}>
        {loading ? (
          <div style={{ padding: "24px", textAlign: "center", color: "var(--vael-text-3)", fontSize: "13px" }}>
            Loading...
          </div>
        ) : tab === "memory" ? (
          entries.length === 0 ? (
            <div style={{ padding: "32px", textAlign: "center" }}>
              <div style={{ fontSize: "24px", marginBottom: "8px" }}>🧠</div>
              <div style={{ fontSize: "14px", color: "var(--vael-text-2)" }}>No memory entries yet</div>
              <div style={{ fontSize: "12px", color: "var(--vael-text-3)", marginTop: "4px" }}>
                Use VaelMemory.sol to store persistent state for this agent.
              </div>
            </div>
          ) : entries.map((entry, i) => (
            <div
              key={entry.key}
              style={{
                padding: "12px 18px", display: "flex", alignItems: "flex-start", gap: "14px",
                borderBottom: i < entries.length - 1 ? "1px solid var(--vael-border)" : "none",
              }}
            >
              {/* Key */}
              <div style={{
                fontSize: "12px", fontFamily: "monospace", fontWeight: 600,
                color: "var(--vael-purple)", flexShrink: 0, minWidth: "120px",
                paddingTop: "2px",
              }}>
                {entry.key}
              </div>

              {/* Value */}
              <div style={{
                flex: 1, fontSize: "12px", color: "var(--vael-text-2)",
                fontFamily: "monospace", wordBreak: "break-all",
                background: "var(--vael-bg)", padding: "4px 8px", borderRadius: "5px",
              }}>
                {entry.value}
              </div>

              {/* Meta */}
              <div style={{ flexShrink: 0, textAlign: "right" }}>
                <div style={{ fontSize: "10px", color: "var(--vael-text-3)" }}>
                  v{entry.version}
                </div>
                <div style={{ fontSize: "10px", color: "var(--vael-text-3)" }}>
                  {timeAgo(entry.updatedAt)}
                </div>
              </div>
            </div>
          ))
        ) : (
          conditions.length === 0 ? (
            <div style={{ padding: "32px", textAlign: "center" }}>
              <div style={{ fontSize: "24px", marginBottom: "8px" }}>⚡</div>
              <div style={{ fontSize: "14px", color: "var(--vael-text-2)" }}>No conditions registered</div>
              <div style={{ fontSize: "12px", color: "var(--vael-text-3)", marginTop: "4px" }}>
                Use VaelConditions.sol to register autonomous triggers for this agent.
              </div>
            </div>
          ) : conditions.map((cond, i) => {
            const color = COND_STATUS_COLORS[cond.status] ?? "#9090b0";
            return (
              <div
                key={cond.conditionId}
                style={{
                  padding: "14px 18px",
                  borderBottom: i < conditions.length - 1 ? "1px solid var(--vael-border)" : "none",
                  display: "flex", alignItems: "flex-start", gap: "12px",
                }}
              >
                {/* Status dot */}
                <div style={{
                  width: "8px", height: "8px", borderRadius: "50%",
                  background: color, flexShrink: 0, marginTop: "5px",
                  boxShadow: `0 0 6px ${color}66`,
                }} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--vael-text-1)" }}>
                      {cond.name}
                    </span>
                    <span style={{
                      fontSize: "10px", padding: "2px 7px", borderRadius: "5px",
                      background: color + "18", color, fontWeight: 500,
                    }}>{cond.status}</span>
                    <span style={{
                      fontSize: "10px", padding: "2px 7px", borderRadius: "5px",
                      background: "var(--vael-bg)", color: "var(--vael-text-3)",
                    }}>{COND_TYPE_LABELS[cond.condType] ?? "Custom"}</span>
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--vael-text-3)" }}>
                    Action: <span style={{ color: "var(--vael-text-2)", fontFamily: "monospace" }}>{cond.actionTag}</span>
                    {" · "}
                    Triggers: {cond.triggerCount}/{cond.maxTriggers === "0" ? "∞" : cond.maxTriggers}
                    {cond.lastTriggered !== "0" && ` · Last: ${timeAgo(cond.lastTriggered)}`}
                  </div>
                </div>

                <div style={{ fontSize: "11px", color: "var(--vael-text-3)", flexShrink: 0 }}>
                  {timeAgo(cond.createdAt)}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
