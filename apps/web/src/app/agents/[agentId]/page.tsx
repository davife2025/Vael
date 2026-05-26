"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAgent, useLedger, usePassport } from "@/hooks/useVael";
import { PassportBadge }   from "@/components/PassportBadge";
import { LedgerTimeline }  from "@/components/LedgerTimeline";
import {
  truncateAddress, truncateAgentId, timeAgo, formatDate,
  getAgentTypeColor, copyToClipboard,
} from "@/lib/utils";

export default function AgentPage() {
  const { agentId } = useParams() as { agentId: string };
  const { agent,   loading: agentLoading  } = useAgent(agentId);
  const { passport,loading: passLoading   } = usePassport(agentId);
  const [ledgerPage, setLedgerPage] = useState(1);
  const { entries, hasMore, loading: ledgerLoading } = useLedger(agentId, {
    limit: "20", page: ledgerPage.toString(),
  });

  const [copied, setCopied] = useState(false);

  async function handleCopy(text: string) {
    await copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (agentLoading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "50vh" }}>
      <div style={{ color: "var(--vael-text-3)", fontSize: "14px" }}>Loading agent...</div>
    </div>
  );

  if (!agent) return (
    <div style={{ textAlign: "center", padding: "80px 20px" }}>
      <div style={{ fontSize: "40px", marginBottom: "12px" }}>🔍</div>
      <div style={{ fontSize: "18px", color: "var(--vael-text-1)", marginBottom: "8px" }}>Agent not found</div>
      <div style={{ fontSize: "14px", color: "var(--vael-text-3)", marginBottom: "20px" }}>
        {truncateAgentId(agentId)} is not registered on Vael.
      </div>
      <Link href="/" style={{ color: "var(--vael-purple)", textDecoration: "none", fontSize: "14px" }}>
        ← Back to Explorer
      </Link>
    </div>
  );

  const typeColor = getAgentTypeColor(agent.agentType);

  return (
    <div style={{ animation: "fade-in 0.3s ease" }}>

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px", fontSize: "13px" }}>
        <Link href="/" style={{ color: "var(--vael-text-3)", textDecoration: "none" }}>Explorer</Link>
        <span style={{ color: "var(--vael-text-3)" }}>→</span>
        <span style={{ color: "var(--vael-text-2)", fontFamily: "monospace" }}>{truncateAgentId(agentId)}</span>
      </div>

      {/* Agent header */}
      <div style={{
        background: "var(--vael-bg-card)", border: "1px solid var(--vael-border)",
        borderRadius: "14px", padding: "28px", marginBottom: "20px",
        position: "relative", overflow: "hidden",
      }}>
        {/* Background glow */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: "2px",
          background: `linear-gradient(90deg, transparent, ${typeColor}66, transparent)`,
        }} />

        <div style={{ display: "flex", alignItems: "flex-start", gap: "20px" }}>
          {/* Type icon */}
          <div style={{
            width: "56px", height: "56px", borderRadius: "14px", flexShrink: 0,
            background: typeColor + "18", border: `1px solid ${typeColor}33`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "22px", fontWeight: 700, color: typeColor,
          }}>
            {(agent.agentType || "?")[0].toUpperCase()}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Name + badges */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "6px" }}>
              <h1 style={{ fontSize: "22px", fontWeight: 600, color: "var(--vael-text-1)", letterSpacing: "-0.5px" }}>
                {agent.name || truncateAgentId(agentId)}
              </h1>
              <span style={{
                fontSize: "11px", padding: "3px 9px", borderRadius: "6px",
                background: typeColor + "18", color: typeColor, fontWeight: 600,
              }}>{agent.agentType}</span>
              {passport?.verified && (
                <span style={{
                  fontSize: "11px", padding: "3px 9px", borderRadius: "6px",
                  background: "rgba(124,111,255,0.12)", color: "var(--vael-purple)", fontWeight: 600,
                }}>✓ Verified</span>
              )}
              <span style={{
                fontSize: "11px", padding: "3px 9px", borderRadius: "6px",
                background: agent.active ? "rgba(74,222,128,0.1)" : "rgba(90,90,120,0.15)",
                color: agent.active ? "var(--vael-green)" : "var(--vael-text-3)", fontWeight: 600,
              }}>
                {agent.active ? "● Active" : "○ Inactive"}
              </span>
            </div>

            {/* Description */}
            {agent.description && (
              <p style={{ fontSize: "14px", color: "var(--vael-text-2)", marginBottom: "14px", lineHeight: 1.6 }}>
                {agent.description}
              </p>
            )}

            {/* Meta row */}
            <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
              {[
                ["Owner",    truncateAddress(agent.owner)],
                ["Born",     formatDate(agent.createdAt)],
                ["Actions",  agent.totalActivities || "0"],
              ].map(([label, val]) => (
                <div key={label as string}>
                  <div style={{ fontSize: "11px", color: "var(--vael-text-3)", marginBottom: "2px" }}>{label}</div>
                  <div style={{ fontSize: "13px", color: "var(--vael-text-2)", fontFamily: label === "Born" ? undefined : "monospace" }}>{val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Agent ID copy button */}
          <button
            onClick={() => handleCopy(agentId)}
            style={{
              background: "transparent", border: "1px solid var(--vael-border)",
              borderRadius: "8px", padding: "8px 12px", cursor: "pointer",
              color: copied ? "var(--vael-green)" : "var(--vael-text-3)",
              fontSize: "12px", fontFamily: "monospace", transition: "all 0.15s",
              flexShrink: 0,
            }}
            title="Copy agent ID"
          >
            {copied ? "✓ Copied" : truncateAgentId(agentId)}
          </button>
        </div>
      </div>

      {/* Passport + Ledger */}
      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: "16px", alignItems: "start" }}>
        {/* Left: Passport */}
        <div>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--vael-text-3)", marginBottom: "10px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Identity
          </div>
          <PassportBadge passport={passport} loading={passLoading} />

          {/* Capabilities */}
          {agent.capabilities && agent.capabilities.length > 0 && (
            <div style={{ marginTop: "14px" }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--vael-text-3)", marginBottom: "8px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                Capabilities
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {agent.capabilities.map((cap: string) => (
                  <span key={cap} style={{
                    fontSize: "12px", padding: "4px 10px", borderRadius: "6px",
                    background: "var(--vael-bg-card)", border: "1px solid var(--vael-border)",
                    color: "var(--vael-text-2)",
                  }}>{cap}</span>
                ))}
              </div>
            </div>
          )}

          {/* Framework/model */}
          {(agent.model || agent.framework) && (
            <div style={{
              marginTop: "14px", background: "var(--vael-bg-card)",
              border: "1px solid var(--vael-border)", borderRadius: "10px", padding: "14px",
            }}>
              {agent.model && (
                <div style={{ marginBottom: "8px" }}>
                  <div style={{ fontSize: "11px", color: "var(--vael-text-3)", marginBottom: "2px" }}>Model</div>
                  <div style={{ fontSize: "13px", color: "var(--vael-text-2)" }}>{agent.model}</div>
                </div>
              )}
              {agent.framework && (
                <div>
                  <div style={{ fontSize: "11px", color: "var(--vael-text-3)", marginBottom: "2px" }}>Framework</div>
                  <div style={{ fontSize: "13px", color: "var(--vael-text-2)" }}>{agent.framework}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Ledger */}
        <div>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--vael-text-3)", marginBottom: "10px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Activity History
          </div>
          <LedgerTimeline
            entries={entries}
            loading={ledgerLoading}
            hasMore={hasMore}
            onLoadMore={() => setLedgerPage(p => p + 1)}
          />
        </div>
      </div>
    </div>
  );
}
