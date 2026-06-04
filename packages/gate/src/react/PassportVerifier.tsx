"use client";
import { useVaelGate } from "./useVaelGate";
import type { GatePolicy, VaelGateConfig } from "../types";
import { GateDenyReason } from "../types";

interface PassportVerifierProps {
  agentId:    string | null;
  policy?:    GatePolicy;
  config:     VaelGateConfig;

  /** Rendered when access is granted */
  children:   React.ReactNode;

  /** Custom loading state */
  fallbackLoading?: React.ReactNode;

  /** Custom denied state — receives reason and message */
  fallbackDenied?: (reason: GateDenyReason | undefined, message: string | undefined) => React.ReactNode;

  /** Custom no-agent state (agentId is null) */
  fallbackNoAgent?: React.ReactNode;
}

const DENY_MESSAGES: Partial<Record<GateDenyReason, string>> = {
  [GateDenyReason.NO_PASSPORT]:          "This agent does not have a Vael Passport.",
  [GateDenyReason.NOT_VERIFIED]:         "This agent's passport has not been verified by Vael.",
  [GateDenyReason.INSUFFICIENT_REP]:     "This agent's reputation score is too low for access.",
  [GateDenyReason.AGENT_INACTIVE]:       "This agent is currently inactive.",
  [GateDenyReason.TYPE_NOT_ALLOWED]:     "This agent type is not permitted here.",
  [GateDenyReason.TYPE_BLOCKED]:         "This agent type is blocked from access.",
  [GateDenyReason.INSUFFICIENT_ACTIVITY]:"This agent has insufficient on-chain activity.",
  [GateDenyReason.NOT_REGISTERED]:       "This agent is not registered on Vael.",
  [GateDenyReason.NETWORK_ERROR]:        "Could not verify agent — Vael API unreachable.",
};

/**
 * PassportVerifier
 *
 * Wraps content behind Vael Passport verification.
 * Only renders `children` when the agent passes the gate policy.
 *
 * Usage:
 * ─────────────────────────────────────────────────────────────
 * <PassportVerifier
 *   agentId={connectedAgentId}
 *   policy={{ minReputation: 400, requireVerified: false }}
 *   config={{ apiUrl: "https://api.vael.xyz" }}
 * >
 *   <ProtectedFeature />
 * </PassportVerifier>
 * ─────────────────────────────────────────────────────────────
 */
export function PassportVerifier({
  agentId,
  policy,
  config,
  children,
  fallbackLoading,
  fallbackDenied,
  fallbackNoAgent,
}: PassportVerifierProps) {
  const { allowed, loading, result } = useVaelGate({ agentId, policy, config });

  if (!agentId) {
    return fallbackNoAgent ? <>{fallbackNoAgent}</> : <DefaultNoAgent />;
  }

  if (loading) {
    return fallbackLoading ? <>{fallbackLoading}</> : <DefaultLoading />;
  }

  if (!allowed) {
    const reason  = result?.allowed === false ? result.reason : undefined;
    const message = result?.allowed === false ? result.message : undefined;
    return fallbackDenied
      ? <>{fallbackDenied(reason, message)}</>
      : <DefaultDenied reason={reason} message={message} />;
  }

  return <>{children}</>;
}

// ─── Default fallback components ─────────────────────────────────────────────

function DefaultLoading() {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      gap: "10px", padding: "24px",
      color: "#9090b0", fontSize: "14px",
    }}>
      <div style={{
        width: "16px", height: "16px",
        border: "2px solid #1e1e2e",
        borderTopColor: "#7c6fff",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
      Verifying Vael Passport...
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function DefaultNoAgent() {
  return (
    <div style={{
      padding: "24px", textAlign: "center",
      background: "#111118", border: "1px solid #1e1e2e",
      borderRadius: "12px",
    }}>
      <div style={{ fontSize: "24px", marginBottom: "8px" }}>🪪</div>
      <div style={{ fontSize: "14px", color: "#f0f0ff", fontWeight: 600, marginBottom: "4px" }}>
        Agent ID required
      </div>
      <div style={{ fontSize: "12px", color: "#9090b0" }}>
        Provide an agent ID to verify passport access.
      </div>
    </div>
  );
}

function DefaultDenied({ reason, message }: { reason?: GateDenyReason; message?: string }) {
  const friendlyMsg = reason ? DENY_MESSAGES[reason] : undefined;

  return (
    <div style={{
      padding: "24px", textAlign: "center",
      background: "rgba(248,113,113,0.06)",
      border: "1px solid rgba(248,113,113,0.2)",
      borderRadius: "12px",
    }}>
      <div style={{ fontSize: "24px", marginBottom: "8px" }}>🚫</div>
      <div style={{ fontSize: "14px", color: "#f0f0ff", fontWeight: 600, marginBottom: "6px" }}>
        Access Denied
      </div>
      <div style={{ fontSize: "13px", color: "#9090b0", marginBottom: "4px" }}>
        {friendlyMsg ?? message ?? "This agent does not meet the requirements."}
      </div>
      {reason && (
        <div style={{
          fontSize: "11px", color: "#5a5a78", fontFamily: "monospace",
          marginTop: "8px", padding: "4px 10px",
          background: "#0a0a0f", borderRadius: "6px", display: "inline-block",
        }}>
          {reason}
        </div>
      )}
    </div>
  );
}
