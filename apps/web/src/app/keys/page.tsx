"use client";
import { useState } from "react";

const TIERS = [
  {
    id:       "FREE",
    label:    "Free",
    limit:    "1,000 req/day",
    price:    "No cost",
    color:    "#9090b0",
    features: ["Agent registry reads", "Ledger queries", "Passport lookups", "Public feed access"],
  },
  {
    id:       "PRO",
    label:    "Pro",
    limit:    "100,000 req/day",
    price:    "Coming soon",
    color:    "#7c6fff",
    features: ["Everything in Free", "Higher rate limits", "Priority indexing", "Webhook support", "Usage analytics"],
  },
  {
    id:       "ENTERPRISE",
    label:    "Enterprise",
    limit:    "Unlimited",
    price:    "Contact us",
    color:    "#fbbf24",
    features: ["Everything in Pro", "Dedicated indexer", "SLA guarantee", "Custom integrations", "On-chain verified tier"],
  },
];

const ENDPOINTS = [
  { method: "GET",  path: "/v1/agents",                     desc: "List all agents with filters"              },
  { method: "GET",  path: "/v1/agents/stats",               desc: "Global registry statistics"               },
  { method: "GET",  path: "/v1/agents/feed",                desc: "Live feed of new agents + activity"       },
  { method: "GET",  path: "/v1/agents/:agentId",            desc: "Get a single agent by ID"                 },
  { method: "GET",  path: "/v1/ledger/:agentId",            desc: "Paginated activity ledger for an agent"   },
  { method: "GET",  path: "/v1/ledger/:agentId/:entryId",   desc: "Single ledger entry"                      },
  { method: "GET",  path: "/v1/passport/:agentId",          desc: "Agent passport + reputation score"        },
  { method: "GET",  path: "/v1/passport/leaderboard",       desc: "Top agents by reputation"                 },
  { method: "POST", path: "/v1/keys",                       desc: "Create an API key"                        },
  { method: "GET",  path: "/v1/keys/me",                    desc: "Get API key info + usage stats"           },
];

const METHOD_COLORS: Record<string, string> = {
  GET:  "#2dd4bf",
  POST: "#7c6fff",
};

export default function KeysPage() {
  const [form, setForm]       = useState({ name: "", wallet: "", tier: "FREE" });
  const [result, setResult]   = useState<{ key: string; tier: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [copied, setCopied]   = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.wallet) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/v1/keys`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:        form.name,
          ownerWallet: form.wallet,
          tier:        form.tier,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create key");
      setResult({ key: data.data.key, tier: data.data.tier });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function copyKey() {
    if (!result) return;
    await navigator.clipboard.writeText(result.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ animation: "fade-in 0.3s ease" }}>

      {/* Header */}
      <div style={{ marginBottom: "36px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 600, letterSpacing: "-0.8px", color: "var(--vael-text-1)", marginBottom: "6px" }}>
          Developer API
        </h1>
        <p style={{ fontSize: "14px", color: "var(--vael-text-3)" }}>
          Query the Vael registry, ledger, and passport data from your application.
          All agent data is indexed in real time from Somnia.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", alignItems: "start" }}>

        {/* Left col — tiers + form */}
        <div>

          {/* Tier cards */}
          <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--vael-text-3)", marginBottom: "12px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Plans
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "28px" }}>
            {TIERS.map(tier => (
              <div
                key={tier.id}
                onClick={() => setForm(f => ({ ...f, tier: tier.id }))}
                style={{
                  background:   "var(--vael-bg-card)",
                  border:       form.tier === tier.id ? `1px solid ${tier.color}` : "1px solid var(--vael-border)",
                  borderRadius: "12px", padding: "16px 18px",
                  cursor: "pointer", transition: "border-color 0.15s",
                  display: "flex", alignItems: "flex-start", gap: "14px",
                }}
              >
                {/* Radio */}
                <div style={{
                  width: "16px", height: "16px", borderRadius: "50%", flexShrink: 0, marginTop: "2px",
                  border: `2px solid ${form.tier === tier.id ? tier.color : "var(--vael-border)"}`,
                  background: form.tier === tier.id ? tier.color : "transparent",
                  transition: "all 0.15s",
                }} />

                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: tier.color }}>{tier.label}</span>
                    <span style={{ fontSize: "12px", color: "var(--vael-text-3)" }}>{tier.limit}</span>
                    <span style={{ fontSize: "12px", color: "var(--vael-text-3)", marginLeft: "auto" }}>{tier.price}</span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {tier.features.map(f => (
                      <span key={f} style={{ fontSize: "11px", color: "var(--vael-text-3)" }}>✓ {f}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Create key form */}
          <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--vael-text-3)", marginBottom: "12px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Create API Key
          </div>

          {result ? (
            <div style={{
              background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.2)",
              borderRadius: "12px", padding: "20px",
            }}>
              <div style={{ fontSize: "13px", color: "var(--vael-green)", fontWeight: 600, marginBottom: "12px" }}>
                ✓ API key created successfully
              </div>
              <div style={{ fontSize: "12px", color: "var(--vael-text-3)", marginBottom: "8px" }}>
                Store this key safely — it will not be shown again.
              </div>
              <div style={{
                background: "var(--vael-bg)", border: "1px solid var(--vael-border)",
                borderRadius: "8px", padding: "12px",
                fontFamily: "monospace", fontSize: "12px", color: "var(--vael-text-2)",
                wordBreak: "break-all", marginBottom: "12px",
              }}>
                {result.key}
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={copyKey}
                  style={{
                    flex: 1, padding: "10px", borderRadius: "8px", border: "none", cursor: "pointer",
                    background: copied ? "rgba(74,222,128,0.15)" : "var(--vael-bg-card)",
                    color: copied ? "var(--vael-green)" : "var(--vael-text-2)",
                    fontSize: "13px", fontWeight: 500, transition: "all 0.15s",
                  }}
                >
                  {copied ? "✓ Copied!" : "Copy Key"}
                </button>
                <button
                  onClick={() => { setResult(null); setForm({ name: "", wallet: "", tier: "FREE" }); }}
                  style={{
                    padding: "10px 16px", borderRadius: "8px", border: "1px solid var(--vael-border)",
                    background: "transparent", color: "var(--vael-text-3)", cursor: "pointer", fontSize: "13px",
                  }}
                >
                  New Key
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[
                { field: "name",   label: "Key name",        placeholder: "e.g. My trading bot"         },
                { field: "wallet", label: "Owner wallet",     placeholder: "0x..."                       },
              ].map(({ field, label, placeholder }) => (
                <div key={field}>
                  <label style={{ fontSize: "12px", color: "var(--vael-text-3)", display: "block", marginBottom: "6px" }}>
                    {label}
                  </label>
                  <input
                    type="text"
                    value={(form as any)[field]}
                    onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                    placeholder={placeholder}
                    required
                    style={{
                      width: "100%", padding: "10px 12px", borderRadius: "8px",
                      background: "var(--vael-bg-card)", border: "1px solid var(--vael-border)",
                      color: "var(--vael-text-1)", fontSize: "13px", outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              ))}

              {error && (
                <div style={{ fontSize: "13px", color: "var(--vael-red)", padding: "10px 12px", background: "rgba(248,113,113,0.08)", borderRadius: "8px" }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !form.name || !form.wallet}
                style={{
                  padding: "12px", borderRadius: "8px", border: "none", cursor: loading ? "not-allowed" : "pointer",
                  background: loading ? "var(--vael-purple-dim)" : "var(--vael-purple)",
                  color: "#fff", fontSize: "14px", fontWeight: 600,
                  opacity: (!form.name || !form.wallet) ? 0.5 : 1,
                  transition: "all 0.15s",
                }}
              >
                {loading ? "Creating..." : `Create ${TIERS.find(t => t.id === form.tier)?.label} Key`}
              </button>
            </form>
          )}
        </div>

        {/* Right col — API reference */}
        <div>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--vael-text-3)", marginBottom: "12px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            API Reference
          </div>

          {/* Base URL */}
          <div style={{
            background: "var(--vael-bg-card)", border: "1px solid var(--vael-border)",
            borderRadius: "10px", padding: "14px 16px", marginBottom: "12px",
          }}>
            <div style={{ fontSize: "11px", color: "var(--vael-text-3)", marginBottom: "6px" }}>Base URL</div>
            <code style={{ fontSize: "13px", color: "var(--vael-purple)", fontFamily: "monospace" }}>
              https://api.vael.xyz
            </code>
          </div>

          {/* Auth */}
          <div style={{
            background: "var(--vael-bg-card)", border: "1px solid var(--vael-border)",
            borderRadius: "10px", padding: "14px 16px", marginBottom: "16px",
          }}>
            <div style={{ fontSize: "11px", color: "var(--vael-text-3)", marginBottom: "6px" }}>Authentication</div>
            <code style={{ fontSize: "12px", color: "var(--vael-text-2)", fontFamily: "monospace" }}>
              x-api-key: vael_sk_...
            </code>
            <div style={{ fontSize: "12px", color: "var(--vael-text-3)", marginTop: "6px" }}>
              Pass your API key in the request header. Public endpoints work without a key at lower rate limits.
            </div>
          </div>

          {/* Endpoints */}
          <div style={{
            background: "var(--vael-bg-card)", border: "1px solid var(--vael-border)",
            borderRadius: "10px", overflow: "hidden",
          }}>
            {ENDPOINTS.map((ep, i) => (
              <div
                key={ep.path}
                style={{
                  padding: "11px 16px",
                  borderBottom: i < ENDPOINTS.length - 1 ? "1px solid var(--vael-border)" : "none",
                  display: "flex", alignItems: "center", gap: "10px",
                }}
              >
                <span style={{
                  fontSize: "10px", fontWeight: 700, padding: "2px 7px", borderRadius: "5px",
                  background: (METHOD_COLORS[ep.method] ?? "#9090b0") + "18",
                  color: METHOD_COLORS[ep.method] ?? "#9090b0",
                  fontFamily: "monospace", flexShrink: 0,
                }}>{ep.method}</span>
                <code style={{ fontSize: "12px", color: "var(--vael-text-2)", fontFamily: "monospace", flex: 1 }}>
                  {ep.path}
                </code>
                <span style={{ fontSize: "11px", color: "var(--vael-text-3)", textAlign: "right", flexShrink: 0 }}>
                  {ep.desc}
                </span>
              </div>
            ))}
          </div>

          {/* SDK CTA */}
          <div style={{
            marginTop: "16px", background: "rgba(124,111,255,0.06)",
            border: "1px solid rgba(124,111,255,0.2)", borderRadius: "10px", padding: "16px",
          }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--vael-purple)", marginBottom: "6px" }}>
              Prefer a typed SDK?
            </div>
            <div style={{ fontSize: "12px", color: "var(--vael-text-3)", marginBottom: "10px" }}>
              The official <code style={{ fontFamily: "monospace", color: "var(--vael-text-2)" }}>@vael/sdk</code> wraps
              the API and contract reads into a single, fully-typed npm package.
            </div>
            <code style={{
              display: "block", background: "var(--vael-bg)", borderRadius: "6px",
              padding: "8px 12px", fontSize: "12px", color: "var(--vael-text-2)",
              fontFamily: "monospace",
            }}>
              npm install @vael/sdk viem
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
