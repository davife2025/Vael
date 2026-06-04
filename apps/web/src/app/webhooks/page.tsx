"use client";
import { useState, useEffect } from "react";
import { NotificationFeed }    from "@/components/NotificationFeed";
import { timeAgo }             from "@/lib/utils";

const ALL_EVENTS = [
  "agent.registered", "agent.deactivated", "agent.reactivated",
  "activity.logged", "passport.issued",
  "reputation.updated", "stake.placed", "stake.withdrawn",
  "task.posted", "task.assigned", "task.completed", "task.settled", "task.disputed",
  "condition.triggered", "memory.set",
];

const EVENT_GROUPS = {
  "Agents":      ["agent.registered", "agent.deactivated", "agent.reactivated"],
  "Activity":    ["activity.logged", "condition.triggered", "memory.set"],
  "Passport":    ["passport.issued", "reputation.updated", "stake.placed", "stake.withdrawn"],
  "Marketplace": ["task.posted", "task.assigned", "task.completed", "task.settled", "task.disputed"],
};

interface Webhook {
  id:           string;
  url:          string;
  events:       string[];
  active:       boolean;
  createdAt:    string;
  lastFiredAt?: string;
  failureCount: number;
  _count:       { deliveries: number };
}

export default function WebhooksPage() {
  const [apiKey,       setApiKey]       = useState("");
  const [authenticated,setAuthenticated]= useState(false);
  const [webhooks,     setWebhooks]     = useState<Webhook[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [newUrl,       setNewUrl]       = useState("");
  const [selectedEvts, setSelectedEvts] = useState<string[]>(["*"]);
  const [creating,     setCreating]     = useState(false);
  const [newSecret,    setNewSecret]    = useState<string | null>(null);
  const [error,        setError]        = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  async function loadWebhooks() {
    setLoading(true);
    try {
      const res  = await fetch(`${apiUrl}/v1/webhooks`, { headers: { "x-api-key": apiKey } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setWebhooks(data.data ?? []);
      setAuthenticated(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function createWebhook() {
    if (!newUrl) return;
    setCreating(true);
    setError(null);
    try {
      const events = selectedEvts.includes("*") ? ["*"] : selectedEvts;
      const res    = await fetch(`${apiUrl}/v1/webhooks`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey },
        body:    JSON.stringify({ url: newUrl, events }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setNewSecret(data.data.secret);
      setNewUrl("");
      await loadWebhooks();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  }

  async function deleteWebhook(id: string) {
    await fetch(`${apiUrl}/v1/webhooks/${id}`, {
      method: "DELETE", headers: { "x-api-key": apiKey },
    });
    setWebhooks(prev => prev.filter(h => h.id !== id));
  }

  function toggleEvent(evt: string) {
    if (evt === "*") { setSelectedEvts(["*"]); return; }
    setSelectedEvts(prev => {
      const without = prev.filter(e => e !== "*");
      return without.includes(evt) ? without.filter(e => e !== evt) : [...without, evt];
    });
  }

  return (
    <div style={{ animation: "fade-in 0.3s ease" }}>

      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 600, letterSpacing: "-0.8px", color: "var(--vael-text-1)", marginBottom: "6px" }}>
          Webhooks & Live Feed
        </h1>
        <p style={{ fontSize: "14px", color: "var(--vael-text-3)" }}>
          Register outbound webhooks to receive real-time POSTs when your agents act.
          Watch the live event stream below — no account needed.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", alignItems: "start" }}>

        {/* Left: webhook manager */}
        <div>

          {/* Auth */}
          {!authenticated ? (
            <div style={{
              background: "var(--vael-bg-card)", border: "1px solid var(--vael-border)",
              borderRadius: "14px", padding: "20px", marginBottom: "16px",
            }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--vael-text-1)", marginBottom: "12px" }}>
                Enter your API key to manage webhooks
              </div>
              <input
                type="text"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="vael_sk_..."
                style={{
                  width: "100%", padding: "10px 12px", borderRadius: "8px",
                  background: "var(--vael-bg)", border: "1px solid var(--vael-border)",
                  color: "var(--vael-text-1)", fontSize: "13px", fontFamily: "monospace",
                  outline: "none", boxSizing: "border-box", marginBottom: "10px",
                }}
                onKeyDown={e => e.key === "Enter" && loadWebhooks()}
              />
              {error && <div style={{ fontSize: "12px", color: "#f87171", marginBottom: "8px" }}>{error}</div>}
              <button
                onClick={loadWebhooks}
                disabled={loading || !apiKey.trim()}
                style={{
                  width: "100%", padding: "10px", borderRadius: "8px", border: "none",
                  background: !apiKey.trim() ? "var(--vael-purple-dim)" : "var(--vael-purple)",
                  color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer",
                }}
              >{loading ? "Loading..." : "Load Webhooks"}</button>
            </div>
          ) : (
            <>
              {/* Create webhook form */}
              <div style={{
                background: "var(--vael-bg-card)", border: "1px solid var(--vael-border)",
                borderRadius: "14px", padding: "20px", marginBottom: "16px",
              }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--vael-text-1)", marginBottom: "14px" }}>
                  Register Webhook
                </div>

                <input
                  type="text"
                  value={newUrl}
                  onChange={e => setNewUrl(e.target.value)}
                  placeholder="https://your-app.com/webhooks/vael"
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: "8px",
                    background: "var(--vael-bg)", border: "1px solid var(--vael-border)",
                    color: "var(--vael-text-1)", fontSize: "13px",
                    outline: "none", boxSizing: "border-box", marginBottom: "12px",
                  }}
                />

                {/* Event selector */}
                <div style={{ marginBottom: "14px" }}>
                  <div style={{ fontSize: "12px", color: "var(--vael-text-3)", marginBottom: "8px" }}>Events</div>
                  <button
                    onClick={() => toggleEvent("*")}
                    style={{
                      padding: "4px 12px", borderRadius: "6px", fontSize: "12px", cursor: "pointer",
                      border:     selectedEvts.includes("*") ? "1px solid #7c6fff" : "1px solid var(--vael-border)",
                      background: selectedEvts.includes("*") ? "rgba(124,111,255,0.12)" : "var(--vael-bg)",
                      color:      selectedEvts.includes("*") ? "#7c6fff" : "var(--vael-text-3)",
                      marginBottom: "8px",
                    }}
                  >* All events</button>

                  {!selectedEvts.includes("*") && Object.entries(EVENT_GROUPS).map(([group, evts]) => (
                    <div key={group} style={{ marginBottom: "8px" }}>
                      <div style={{ fontSize: "11px", color: "var(--vael-text-3)", marginBottom: "4px" }}>{group}</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                        {evts.map(evt => (
                          <button
                            key={evt}
                            onClick={() => toggleEvent(evt)}
                            style={{
                              padding: "3px 9px", borderRadius: "5px", fontSize: "11px", cursor: "pointer",
                              border:     selectedEvts.includes(evt) ? "1px solid #2dd4bf" : "1px solid var(--vael-border)",
                              background: selectedEvts.includes(evt) ? "rgba(45,212,191,0.1)" : "var(--vael-bg)",
                              color:      selectedEvts.includes(evt) ? "#2dd4bf" : "var(--vael-text-3)",
                            }}
                          >{evt.split(".")[1]}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {error && <div style={{ fontSize: "12px", color: "#f87171", marginBottom: "8px" }}>{error}</div>}

                {newSecret && (
                  <div style={{
                    background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.2)",
                    borderRadius: "8px", padding: "12px", marginBottom: "12px",
                  }}>
                    <div style={{ fontSize: "11px", color: "#4ade80", marginBottom: "6px", fontWeight: 600 }}>
                      ✓ Webhook created — store this secret safely
                    </div>
                    <div style={{ fontSize: "11px", fontFamily: "monospace", color: "var(--vael-text-2)", wordBreak: "break-all" }}>
                      {newSecret}
                    </div>
                  </div>
                )}

                <button
                  onClick={createWebhook}
                  disabled={creating || !newUrl}
                  style={{
                    width: "100%", padding: "10px", borderRadius: "8px", border: "none",
                    background: !newUrl ? "var(--vael-purple-dim)" : "var(--vael-purple)",
                    color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer",
                  }}
                >{creating ? "Creating..." : "Register Webhook"}</button>
              </div>

              {/* Webhook list */}
              <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--vael-text-3)", marginBottom: "10px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                Your Webhooks ({webhooks.length})
              </div>
              {webhooks.length === 0 ? (
                <div style={{ padding: "24px", textAlign: "center", background: "var(--vael-bg-card)", border: "1px solid var(--vael-border)", borderRadius: "12px" }}>
                  <div style={{ fontSize: "13px", color: "var(--vael-text-3)" }}>No webhooks yet</div>
                </div>
              ) : webhooks.map((hook, i) => (
                <div key={hook.id} style={{
                  background: "var(--vael-bg-card)", border: `1px solid ${hook.active ? "var(--vael-border)" : "rgba(248,113,113,0.2)"}`,
                  borderRadius: "10px", padding: "14px 16px", marginBottom: "8px",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                    <div style={{ fontSize: "13px", color: "var(--vael-text-1)", fontFamily: "monospace", fontWeight: 500, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {hook.url}
                    </div>
                    <button
                      onClick={() => deleteWebhook(hook.id)}
                      style={{ background: "transparent", border: "none", cursor: "pointer", color: "#f87171", fontSize: "12px", marginLeft: "8px", flexShrink: 0 }}
                    >Delete</button>
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <span style={{
                      fontSize: "10px", padding: "2px 7px", borderRadius: "5px",
                      background: hook.active ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)",
                      color: hook.active ? "#4ade80" : "#f87171",
                    }}>{hook.active ? "Active" : "Disabled"}</span>
                    <span style={{ fontSize: "10px", color: "var(--vael-text-3)" }}>{hook._count.deliveries} deliveries</span>
                    {hook.lastFiredAt && <span style={{ fontSize: "10px", color: "var(--vael-text-3)" }}>Last: {timeAgo(hook.lastFiredAt)}</span>}
                    {hook.failureCount > 0 && <span style={{ fontSize: "10px", color: "#f87171" }}>{hook.failureCount} failures</span>}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "8px" }}>
                    {hook.events.slice(0, 5).map(e => (
                      <span key={e} style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "4px", background: "rgba(124,111,255,0.1)", color: "#7c6fff" }}>{e}</span>
                    ))}
                    {hook.events.length > 5 && <span style={{ fontSize: "10px", color: "var(--vael-text-3)" }}>+{hook.events.length - 5} more</span>}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Right: live feed */}
        <div>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--vael-text-3)", marginBottom: "10px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Live Event Stream
          </div>
          <NotificationFeed showStatus />

          {/* Verification guide */}
          <div style={{
            marginTop: "16px", background: "var(--vael-bg-card)", border: "1px solid var(--vael-border)",
            borderRadius: "12px", padding: "16px",
          }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--vael-text-1)", marginBottom: "10px" }}>
              Verifying webhook signatures
            </div>
            <div style={{
              background: "var(--vael-bg)", borderRadius: "8px", padding: "12px",
              fontSize: "11px", fontFamily: "monospace", color: "var(--vael-text-2)", lineHeight: 1.7,
            }}>
              <span style={{ color: "#7c6fff" }}>import</span>{" { verifySignature } from \"@vael/gate\";"}<br />
              <br />
              <span style={{ color: "#9090b0" }}>// In your webhook handler:</span><br />
              <span style={{ color: "#7c6fff" }}>const</span>{" valid = verifySignature("}<br />
              {"  req.body,"}<br />
              {"  req.headers[\"x-vael-timestamp\"],"}<br />
              {"  req.headers[\"x-vael-signature\"],"}<br />
              {"  YOUR_WEBHOOK_SECRET"}<br />
              {");"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
