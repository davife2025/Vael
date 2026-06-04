"use client";
import { useState } from "react";
import { getReputationColor, getReputationLabel, truncateAddress } from "@/lib/utils";

const POLICY_PRESETS = [
  { label: "Open access",         policy: { requirePassport: false } },
  { label: "Passport required",   policy: { requirePassport: true } },
  { label: "Min 300 reputation",  policy: { minReputation: 300 } },
  { label: "Min 700 reputation",  policy: { minReputation: 700 } },
  { label: "Verified only",       policy: { requireVerified: true } },
  { label: "Oracle agents only",  policy: { allowedTypes: ["oracle"] } },
  { label: "Min 10 activities",   policy: { minActivities: 10 } },
];

const DENY_LABELS: Record<string, string> = {
  NO_PASSPORT:            "No Passport",
  NOT_VERIFIED:           "Not Verified",
  INSUFFICIENT_REP:       "Insufficient Reputation",
  AGENT_INACTIVE:         "Agent Inactive",
  TYPE_NOT_ALLOWED:       "Type Not Allowed",
  TYPE_BLOCKED:           "Type Blocked",
  INSUFFICIENT_ACTIVITY:  "Insufficient Activity",
  CUSTOM_REJECTED:        "Custom Rejected",
  NETWORK_ERROR:          "Network Error",
};

export default function GatePage() {
  const [agentId,    setAgentId]   = useState("");
  const [preset,     setPreset]    = useState(0);
  const [result,     setResult]    = useState<any>(null);
  const [loading,    setLoading]   = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  async function verify() {
    if (!agentId.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      // Fetch agent + passport in parallel
      const [agentRes, passportRes] = await Promise.all([
        fetch(`${apiUrl}/v1/agents/${agentId}`),
        fetch(`${apiUrl}/v1/passport/${agentId}`),
      ]);

      if (!agentRes.ok) {
        setResult({ allowed: false, reason: "NETWORK_ERROR", message: "Agent not found" });
        return;
      }

      const agentData   = await agentRes.json();
      const passportData= passportRes.ok ? await passportRes.json() : null;

      const agent   = agentData.data;
      const passport= passportData?.data;
      const policy  = POLICY_PRESETS[preset].policy as any;

      // Evaluate policy client-side (mirrors VaelGate core logic)
      if (!agent.active) {
        setResult({ allowed: false, reason: "AGENT_INACTIVE", message: "Agent is inactive", agent, passport });
        return;
      }
      if (policy.requirePassport !== false && !passport) {
        setResult({ allowed: false, reason: "NO_PASSPORT", message: "Agent has no Vael Passport", agent });
        return;
      }
      if (policy.requireVerified && !passport?.verified) {
        setResult({ allowed: false, reason: "NOT_VERIFIED", message: "Passport is not Vael-verified", agent, passport });
        return;
      }
      if (policy.minReputation && Number(passport?.reputationScore ?? 0) < policy.minReputation) {
        setResult({ allowed: false, reason: "INSUFFICIENT_REP", message: `Score ${passport?.reputationScore ?? 0} < ${policy.minReputation}`, agent, passport });
        return;
      }
      if (policy.allowedTypes && !policy.allowedTypes.includes(agent.agentType)) {
        setResult({ allowed: false, reason: "TYPE_NOT_ALLOWED", message: `Type "${agent.agentType}" not in [${policy.allowedTypes.join(", ")}]`, agent, passport });
        return;
      }
      if (policy.minActivities && Number(agent.totalActivities ?? 0) < policy.minActivities) {
        setResult({ allowed: false, reason: "INSUFFICIENT_ACTIVITY", message: `${agent.totalActivities} activities < ${policy.minActivities} required`, agent, passport });
        return;
      }

      setResult({ allowed: true, agent, passport });
    } catch (e: any) {
      setResult({ allowed: false, reason: "NETWORK_ERROR", message: e.message });
    } finally {
      setLoading(false);
    }
  }

  const repScore = Number(result?.passport?.reputationScore ?? 0);
  const repColor = getReputationColor(repScore);

  return (
    <div style={{ animation: "fade-in 0.3s ease" }}>

      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 600, letterSpacing: "-0.8px", color: "var(--vael-text-1)", marginBottom: "6px" }}>
          VaelGate
        </h1>
        <p style={{ fontSize: "14px", color: "var(--vael-text-3)", maxWidth: "520px" }}>
          Passport verification middleware for Somnia dApps. Drop an agent ID in, set a policy,
          and see whether it passes or fails — exactly as your dApp would evaluate it.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", alignItems: "start" }}>

        {/* Left — verifier */}
        <div>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--vael-text-3)", marginBottom: "12px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Verify Agent
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* Agent ID input */}
            <div>
              <label style={{ fontSize: "12px", color: "var(--vael-text-3)", display: "block", marginBottom: "6px" }}>
                Agent ID (0x-prefixed bytes32)
              </label>
              <input
                type="text"
                value={agentId}
                onChange={e => setAgentId(e.target.value)}
                placeholder="0x..."
                style={{
                  width: "100%", padding: "10px 12px", borderRadius: "8px",
                  background: "var(--vael-bg-card)", border: "1px solid var(--vael-border)",
                  color: "var(--vael-text-1)", fontSize: "13px", fontFamily: "monospace",
                  outline: "none", boxSizing: "border-box",
                }}
              />
            </div>

            {/* Policy preset */}
            <div>
              <label style={{ fontSize: "12px", color: "var(--vael-text-3)", display: "block", marginBottom: "6px" }}>
                Gate policy
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {POLICY_PRESETS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => setPreset(i)}
                    style={{
                      padding: "6px 12px", borderRadius: "8px", fontSize: "12px", cursor: "pointer",
                      border:     preset === i ? "1px solid var(--vael-purple)" : "1px solid var(--vael-border)",
                      background: preset === i ? "rgba(124,111,255,0.12)" : "var(--vael-bg-card)",
                      color:      preset === i ? "var(--vael-purple)" : "var(--vael-text-2)",
                      transition: "all 0.15s",
                    }}
                  >{p.label}</button>
                ))}
              </div>
            </div>

            {/* Policy JSON display */}
            <div style={{
              background: "var(--vael-bg)", border: "1px solid var(--vael-border)",
              borderRadius: "8px", padding: "12px",
              fontSize: "12px", fontFamily: "monospace", color: "var(--vael-text-2)",
            }}>
              {JSON.stringify(POLICY_PRESETS[preset].policy, null, 2)}
            </div>

            <button
              onClick={verify}
              disabled={loading || !agentId.trim()}
              style={{
                padding: "12px", borderRadius: "8px", border: "none",
                background: loading || !agentId.trim() ? "var(--vael-purple-dim)" : "var(--vael-purple)",
                color: "#fff", fontSize: "14px", fontWeight: 600,
                cursor: loading || !agentId.trim() ? "not-allowed" : "pointer",
                transition: "background 0.15s",
              }}
            >
              {loading ? "Verifying..." : "Verify Passport"}
            </button>
          </div>
        </div>

        {/* Right — result */}
        <div>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--vael-text-3)", marginBottom: "12px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Result
          </div>

          {!result ? (
            <div style={{
              background: "var(--vael-bg-card)", border: "1px solid var(--vael-border)",
              borderRadius: "14px", padding: "40px", textAlign: "center",
            }}>
              <div style={{ fontSize: "28px", marginBottom: "8px" }}>🔐</div>
              <div style={{ fontSize: "13px", color: "var(--vael-text-3)" }}>
                Enter an agent ID and select a policy to verify.
              </div>
            </div>
          ) : (
            <div style={{
              background: "var(--vael-bg-card)",
              border: `1px solid ${result.allowed ? "rgba(74,222,128,0.3)" : "rgba(248,113,113,0.3)"}`,
              borderRadius: "14px", overflow: "hidden",
            }}>
              {/* Status banner */}
              <div style={{
                padding: "16px 20px", display: "flex", alignItems: "center", gap: "12px",
                background: result.allowed ? "rgba(74,222,128,0.06)" : "rgba(248,113,113,0.06)",
                borderBottom: "1px solid var(--vael-border)",
              }}>
                <div style={{ fontSize: "28px" }}>{result.allowed ? "✅" : "🚫"}</div>
                <div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: result.allowed ? "#4ade80" : "#f87171" }}>
                    {result.allowed ? "Access Granted" : "Access Denied"}
                  </div>
                  {!result.allowed && (
                    <div style={{ fontSize: "12px", color: "var(--vael-text-2)", marginTop: "2px" }}>
                      {DENY_LABELS[result.reason] ?? result.reason} — {result.message}
                    </div>
                  )}
                </div>
              </div>

              {/* Agent details */}
              {result.agent && (
                <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  {[
                    ["Agent ID",   result.agent.id?.slice(0, 18) + "..."],
                    ["Owner",      truncateAddress(result.agent.owner)],
                    ["Type",       result.agent.agentType],
                    ["Status",     result.agent.active ? "Active" : "Inactive"],
                    ["Activities", result.agent.totalActivities ?? "0"],
                  ].map(([label, val]) => (
                    <div key={label as string} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "12px", color: "var(--vael-text-3)" }}>{label}</span>
                      <span style={{ fontSize: "12px", color: "var(--vael-text-2)", fontFamily: "monospace" }}>{val}</span>
                    </div>
                  ))}

                  {result.passport && (
                    <>
                      <div style={{ borderTop: "1px solid var(--vael-border)", paddingTop: "10px", marginTop: "2px" }} />
                      {[
                        ["Passport Token", `#${result.passport.tokenId}`],
                        ["Reputation",     `${result.passport.reputationScore} / 1000`],
                        ["Verified",       result.passport.verified ? "✓ Yes" : "✗ No"],
                      ].map(([label, val]) => (
                        <div key={label as string} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "12px", color: "var(--vael-text-3)" }}>{label}</span>
                          <span style={{
                            fontSize: "12px", fontFamily: "monospace",
                            color: label === "Reputation" ? repColor : "var(--vael-text-2)",
                            fontWeight: label === "Reputation" ? 600 : 400,
                          }}>{val as string}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Code snippet */}
          <div style={{ marginTop: "16px" }}>
            <div style={{ fontSize: "12px", color: "var(--vael-text-3)", marginBottom: "8px" }}>
              Using this gate in your dApp:
            </div>
            <div style={{
              background: "var(--vael-bg-card)", border: "1px solid var(--vael-border)",
              borderRadius: "10px", padding: "14px 16px",
              fontSize: "12px", fontFamily: "monospace", color: "var(--vael-text-2)",
              lineHeight: 1.7,
            }}>
              <span style={{ color: "#7c6fff" }}>import</span>{" "}{"{ useVaelGate }"}{" "}
              <span style={{ color: "#7c6fff" }}>from</span>{" "}<span style={{ color: "#4ade80" }}>"@vael/gate/react"</span>;<br /><br />
              <span style={{ color: "#7c6fff" }}>const</span>{" "}{"{ allowed, loading } = useVaelGate({"}<br />
              {"  agentId: connectedAgentId,"}<br />
              {"  policy:  "}{JSON.stringify(POLICY_PRESETS[preset].policy)}<span style={{ color: "," }}>,</span><br />
              {"  config:  { apiUrl: \"https://api.vael.xyz\" },"}<br />
              {"});"}<br />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
