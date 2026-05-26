"use client";
import { useState } from "react";
import type { ActivitySummary } from "@/lib/api";
import { timeAgo, truncateAddress, formatDateTime } from "@/lib/utils";

const ACTION_COLORS: Record<string, string> = {
  transfer: "#2dd4bf",
  trade:    "#7c6fff",
  swap:     "#7c6fff",
  vote:     "#60a5fa",
  stake:    "#fbbf24",
  unstake:  "#fbbf24",
  message:  "#4ade80",
  execute:  "#f472b6",
  delegate: "#a78bfa",
  custom:   "#9090b0",
};

function actionColor(action: string) {
  return ACTION_COLORS[action?.toLowerCase()] ?? "#9090b0";
}

interface LedgerTimelineProps {
  entries:  ActivitySummary[];
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

export function LedgerTimeline({ entries, loading, hasMore, onLoadMore }: LedgerTimelineProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (loading && entries.length === 0) return (
    <div style={{
      background: "var(--vael-bg-card)", border: "1px solid var(--vael-border)",
      borderRadius: "14px", padding: "32px",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{ color: "var(--vael-text-3)", fontSize: "13px" }}>Loading activity...</div>
    </div>
  );

  if (!loading && entries.length === 0) return (
    <div style={{
      background: "var(--vael-bg-card)", border: "1px solid var(--vael-border)",
      borderRadius: "14px", padding: "32px", textAlign: "center",
    }}>
      <div style={{ fontSize: "24px", marginBottom: "8px" }}>📭</div>
      <div style={{ color: "var(--vael-text-2)", fontSize: "14px" }}>No activity recorded yet.</div>
      <div style={{ color: "var(--vael-text-3)", fontSize: "12px", marginTop: "4px" }}>
        Activity will appear here once the agent begins acting on Somnia.
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
        padding: "16px 20px",
        borderBottom: "1px solid var(--vael-border)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--vael-text-1)" }}>
          Activity Ledger
        </div>
        <div style={{ fontSize: "12px", color: "var(--vael-text-3)" }}>
          {entries.length} entries
        </div>
      </div>

      {/* Entries */}
      <div>
        {entries.map((entry, i) => {
          const color    = actionColor(entry.action);
          const isExpand = expanded === entry.id;

          return (
            <div
              key={entry.id}
              style={{
                borderBottom: i < entries.length - 1 ? "1px solid var(--vael-border)" : "none",
                transition: "background 0.1s",
              }}
            >
              {/* Main row */}
              <div
                onClick={() => setExpanded(isExpand ? null : entry.id)}
                style={{
                  padding: "14px 20px", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: "14px",
                  background: isExpand ? "var(--vael-bg-hover)" : "transparent",
                }}
                onMouseEnter={e => !isExpand && ((e.currentTarget as HTMLElement).style.background = "var(--vael-bg-hover)")}
                onMouseLeave={e => !isExpand && ((e.currentTarget as HTMLElement).style.background = "transparent")}
              >
                {/* Timeline dot */}
                <div style={{
                  width: "8px", height: "8px", borderRadius: "50%",
                  background: color, flexShrink: 0,
                  boxShadow: `0 0 6px ${color}66`,
                }} />

                {/* Action badge */}
                <div style={{
                  fontSize: "11px", padding: "3px 9px", borderRadius: "6px", fontWeight: 600,
                  background: color + "18", color, flexShrink: 0, letterSpacing: "0.02em",
                }}>
                  {entry.action}
                </div>

                {/* Entry ID */}
                <div style={{
                  fontSize: "12px", color: "var(--vael-text-3)", fontFamily: "monospace",
                  flexShrink: 0,
                }}>
                  #{entry.entryId}
                </div>

                {/* Target */}
                {entry.target && entry.target !== "0x0000000000000000000000000000000000000000" && (
                  <div style={{ fontSize: "12px", color: "var(--vael-text-2)", fontFamily: "monospace" }}>
                    → {truncateAddress(entry.target, 5)}
                  </div>
                )}

                {/* Timestamp */}
                <div style={{ fontSize: "12px", color: "var(--vael-text-3)", marginLeft: "auto", flexShrink: 0 }}>
                  {timeAgo(entry.timestamp)}
                </div>

                {/* Expand chevron */}
                <div style={{
                  fontSize: "10px", color: "var(--vael-text-3)",
                  transform: isExpand ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s",
                }}>▾</div>
              </div>

              {/* Expanded details */}
              {isExpand && (
                <div style={{
                  padding: "12px 20px 16px 42px",
                  background: "var(--vael-bg-hover)",
                  borderTop: "1px solid var(--vael-border)",
                  display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px",
                }}>
                  {[
                    ["Block",       entry.blockNumber],
                    ["Timestamp",   formatDateTime(entry.timestamp)],
                    ["Tx Hash",     truncateAddress(entry.transactionHash, 8)],
                    ["Condition",   entry.conditionHash !== "0x" + "0".repeat(64)
                      ? truncateAddress(entry.conditionHash, 8) : "—"],
                  ].map(([label, val]) => (
                    <div key={label as string}>
                      <div style={{ fontSize: "11px", color: "var(--vael-text-3)", marginBottom: "2px" }}>{label}</div>
                      <div style={{ fontSize: "12px", color: "var(--vael-text-2)", fontFamily: "monospace" }}>{val}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Load more */}
      {hasMore && (
        <div style={{ padding: "14px", textAlign: "center", borderTop: "1px solid var(--vael-border)" }}>
          <button
            onClick={onLoadMore}
            style={{
              background: "transparent", border: "1px solid var(--vael-border)",
              borderRadius: "8px", padding: "8px 20px",
              color: "var(--vael-text-2)", fontSize: "13px", cursor: "pointer",
              transition: "border-color 0.15s",
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = "var(--vael-border-soft)")}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = "var(--vael-border)")}
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
