"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RegisterForm {
  // Identity
  agentId:     string;
  owner:       string;
  agentType:   string;
  // Profile
  name:        string;
  description: string;
  imageUrl:    string;
  model:       string;
  framework:   string;
  capabilities:string[];
  // Metadata
  metadataUri: string;
}

const EMPTY_FORM: RegisterForm = {
  agentId:      "",
  owner:        "",
  agentType:    "",
  name:         "",
  description:  "",
  imageUrl:     "",
  model:        "",
  framework:    "",
  capabilities: [],
  metadataUri:  "",
};

// ─── Constants ────────────────────────────────────────────────────────────────

const AGENT_TYPES = [
  { value: "trading",  label: "Trading",  desc: "DeFi execution, arbitrage, portfolio management",     icon: "📈" },
  { value: "oracle",   label: "Oracle",   desc: "Data feeds, price sources, external information",     icon: "🔮" },
  { value: "npc",      label: "NPC",      desc: "Game characters, interactive on-chain entities",      icon: "🎮" },
  { value: "social",   label: "Social",   desc: "Content creation, community, communication agents",   icon: "💬" },
  { value: "guardian", label: "Guardian", desc: "Security monitors, multisig coordinators, watchdogs", icon: "🛡️" },
  { value: "bridge",   label: "Bridge",   desc: "Cross-chain relayers, liquidity routers",             icon: "🌉" },
];

const CAPABILITY_OPTIONS = [
  "read-chain", "write-chain", "sign-transactions", "read-api",
  "call-llm", "store-memory", "emit-events", "cross-chain",
  "stake", "vote", "mint-nft", "manage-keys",
];

const MODEL_SUGGESTIONS = [
  "claude-3-5-sonnet", "gpt-4o", "gemini-1.5-pro",
  "llama-3-70b", "mistral-large", "custom",
];

const FRAMEWORK_SUGGESTIONS = [
  "LangChain", "AutoGen", "CrewAI", "custom", "none",
];

const STEPS = ["Type", "Identity", "Profile", "Confirm"];

// ─── Step indicators ──────────────────────────────────────────────────────────

function StepBar({ current }: { current: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0", marginBottom: "36px" }}>
      {STEPS.map((label, i) => {
        const done    = i < current;
        const active  = i === current;
        const isLast  = i === STEPS.length - 1;

        return (
          <div key={label} style={{ display: "flex", alignItems: "center", flex: isLast ? 0 : 1 }}>
            {/* Step circle */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
              <div style={{
                width: "28px", height: "28px", borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "12px", fontWeight: 600, flexShrink: 0,
                background: done ? "var(--vael-purple)" : active ? "rgba(124,111,255,0.18)" : "var(--vael-bg-card)",
                border: done ? "1px solid var(--vael-purple)" : active ? "1px solid var(--vael-purple)" : "1px solid var(--vael-border)",
                color: done ? "#fff" : active ? "var(--vael-purple)" : "var(--vael-text-3)",
                transition: "all 0.2s",
              }}>
                {done ? "✓" : i + 1}
              </div>
              <span style={{
                fontSize: "11px", fontWeight: active ? 600 : 400,
                color: active ? "var(--vael-text-1)" : done ? "var(--vael-purple)" : "var(--vael-text-3)",
                whiteSpace: "nowrap",
              }}>{label}</span>
            </div>
            {/* Connector line */}
            {!isLast && (
              <div style={{
                flex: 1, height: "1px", marginBottom: "18px", marginLeft: "8px", marginRight: "8px",
                background: done ? "var(--vael-purple)" : "var(--vael-border)",
                transition: "background 0.3s",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Field helpers ────────────────────────────────────────────────────────────

function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "7px" }}>
      <span style={{ fontSize: "12px", color: "var(--vael-text-2)", fontWeight: 500 }}>{children}</span>
      {hint && <span style={{ fontSize: "11px", color: "var(--vael-text-3)" }}>{hint}</span>}
    </div>
  );
}

function Input({
  value, onChange, placeholder, mono, disabled,
}: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; mono?: boolean; disabled?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        width: "100%", padding: "10px 12px", borderRadius: "8px",
        background: disabled ? "var(--vael-bg)" : "var(--vael-bg-card)",
        border: "1px solid var(--vael-border)",
        color: disabled ? "var(--vael-text-3)" : "var(--vael-text-1)",
        fontSize: "13px", fontFamily: mono ? "monospace" : "inherit",
        outline: "none", boxSizing: "border-box",
        transition: "border-color 0.15s",
        cursor: disabled ? "not-allowed" : "text",
      }}
      onFocus={e => !disabled && ((e.target as HTMLInputElement).style.borderColor = "var(--vael-purple)")}
      onBlur={e  => ((e.target as HTMLInputElement).style.borderColor = "var(--vael-border)")}
    />
  );
}

function Textarea({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{
        width: "100%", padding: "10px 12px", borderRadius: "8px",
        background: "var(--vael-bg-card)", border: "1px solid var(--vael-border)",
        color: "var(--vael-text-1)", fontSize: "13px", resize: "vertical",
        outline: "none", boxSizing: "border-box", lineHeight: 1.6,
        fontFamily: "inherit", transition: "border-color 0.15s",
      }}
      onFocus={e => ((e.target as HTMLTextAreaElement).style.borderColor = "var(--vael-purple)")}
      onBlur={e  => ((e.target as HTMLTextAreaElement).style.borderColor = "var(--vael-border)")}
    />
  );
}

function FieldGroup({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px", ...style }}>
      {children}
    </div>
  );
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validate(step: number, form: RegisterForm): string | null {
  if (step === 0 && !form.agentType)    return "Select an agent type to continue.";
  if (step === 1) {
    if (!form.agentId)   return "Agent ID is required.";
    if (!/^0x[0-9a-fA-F]{64}$/.test(form.agentId)) return "Agent ID must be 0x-prefixed 32 bytes (66 hex chars).";
    if (!form.owner)     return "Owner wallet is required.";
    if (!/^0x[0-9a-fA-F]{40}$/.test(form.owner)) return "Owner must be a valid Ethereum address.";
  }
  return null;
}

// ─── Summary row ──────────────────────────────────────────────────────────────

function SummaryRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", paddingBottom: "10px", borderBottom: "1px solid var(--vael-border)" }}>
      <span style={{ fontSize: "12px", color: "var(--vael-text-3)", flexShrink: 0, paddingTop: "1px" }}>{label}</span>
      <span style={{
        fontSize: "12px", color: "var(--vael-text-1)", fontFamily: mono ? "monospace" : "inherit",
        textAlign: "right", wordBreak: "break-all",
      }}>{value || "—"}</span>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function RegisterAgentPage() {
  const router = useRouter();

  const [step,      setStep]      = useState(0);
  const [form,      setForm]      = useState<RegisterForm>(EMPTY_FORM);
  const [error,     setError]     = useState<string | null>(null);
  const [submitting,setSubmitting]= useState(false);
  const [result,    setResult]    = useState<{ agentId: string; txHash: string } | null>(null);
  const [capInput,  setCapInput]  = useState("");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  function set<K extends keyof RegisterForm>(key: K, value: RegisterForm[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function next() {
    const err = validate(step, form);
    if (err) { setError(err); return; }
    setError(null);
    setStep(s => s + 1);
  }

  function back() {
    setError(null);
    setStep(s => s - 1);
  }

  function toggleCapability(cap: string) {
    set("capabilities",
      form.capabilities.includes(cap)
        ? form.capabilities.filter(c => c !== cap)
        : [...form.capabilities, cap]
    );
  }

  function addCustomCap() {
    const trimmed = capInput.trim().toLowerCase().replace(/\s+/g, "-");
    if (!trimmed || form.capabilities.includes(trimmed)) return;
    set("capabilities", [...form.capabilities, trimmed]);
    setCapInput("");
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/v1/agents`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId:      form.agentId,
          owner:        form.owner,
          agentType:    form.agentType,
          name:         form.name || undefined,
          description:  form.description || undefined,
          imageUrl:     form.imageUrl || undefined,
          model:        form.model || undefined,
          framework:    form.framework || undefined,
          capabilities: form.capabilities.length > 0 ? form.capabilities : undefined,
          metadataUri:  form.metadataUri || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      setResult({ agentId: data.data?.id || form.agentId, txHash: data.data?.txHash || "" });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success screen ──────────────────────────────────────────────────────────

  if (result) {
    return (
      <div style={{ animation: "fade-in 0.3s ease", maxWidth: "520px", margin: "0 auto" }}>
        <div style={{
          background: "var(--vael-bg-card)", border: "1px solid rgba(74,222,128,0.3)",
          borderRadius: "16px", padding: "40px", textAlign: "center",
        }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🤖</div>
          <h2 style={{ fontSize: "22px", fontWeight: 600, color: "var(--vael-green)", marginBottom: "8px", letterSpacing: "-0.5px" }}>
            Agent registered
          </h2>
          <p style={{ fontSize: "14px", color: "var(--vael-text-3)", marginBottom: "24px" }}>
            Your agent is live on Somnia. It now has a permanent on-chain identity.
          </p>

          <div style={{
            background: "var(--vael-bg)", border: "1px solid var(--vael-border)",
            borderRadius: "10px", padding: "14px 16px", marginBottom: "24px",
            textAlign: "left", display: "flex", flexDirection: "column", gap: "8px",
          }}>
            <div style={{ fontSize: "11px", color: "var(--vael-text-3)" }}>Agent ID</div>
            <div style={{ fontSize: "12px", fontFamily: "monospace", color: "var(--vael-text-1)", wordBreak: "break-all" }}>
              {result.agentId}
            </div>
            {result.txHash && (
              <>
                <div style={{ fontSize: "11px", color: "var(--vael-text-3)", marginTop: "4px" }}>Transaction</div>
                <div style={{ fontSize: "12px", fontFamily: "monospace", color: "var(--vael-purple)", wordBreak: "break-all" }}>
                  {result.txHash}
                </div>
              </>
            )}
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => router.push(`/agents/${result.agentId}`)}
              style={{
                flex: 1, padding: "11px", borderRadius: "8px", border: "none",
                background: "var(--vael-purple)", color: "#fff",
                fontSize: "13px", fontWeight: 600, cursor: "pointer",
              }}
            >
              View Agent →
            </button>
            <button
              onClick={() => { setResult(null); setForm(EMPTY_FORM); setStep(0); }}
              style={{
                padding: "11px 18px", borderRadius: "8px",
                border: "1px solid var(--vael-border)", background: "transparent",
                color: "var(--vael-text-3)", fontSize: "13px", cursor: "pointer",
              }}
            >
              Register another
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Form ────────────────────────────────────────────────────────────────────

  const selectedType = AGENT_TYPES.find(t => t.value === form.agentType);

  return (
    <div style={{ animation: "fade-in 0.3s ease" }}>

      {/* Page header */}
      <div style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", fontSize: "13px" }}>
          <Link href="/" style={{ color: "var(--vael-text-3)", textDecoration: "none" }}>Explorer</Link>
          <span style={{ color: "var(--vael-text-3)" }}>→</span>
          <span style={{ color: "var(--vael-text-2)" }}>Register Agent</span>
        </div>
        <h1 style={{ fontSize: "28px", fontWeight: 600, letterSpacing: "-0.8px", color: "var(--vael-text-1)", marginBottom: "6px" }}>
          Register an Agent
        </h1>
        <p style={{ fontSize: "14px", color: "var(--vael-text-3)", maxWidth: "480px" }}>
          Give your AI agent a permanent on-chain identity on Somnia. It will receive an agent ID,
          a ledger, and optionally a Vael Passport.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "28px", alignItems: "start" }}>

        {/* ── Left: form ──────────────────────────────────────────────────── */}
        <div style={{
          background: "var(--vael-bg-card)", border: "1px solid var(--vael-border)",
          borderRadius: "16px", padding: "28px",
        }}>
          <StepBar current={step} />

          {/* ── Step 0: Type ───────────────────────────────────────────────── */}
          {step === 0 && (
            <div style={{ animation: "fade-in 0.2s ease" }}>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--vael-text-1)", marginBottom: "4px" }}>
                What kind of agent is this?
              </div>
              <div style={{ fontSize: "13px", color: "var(--vael-text-3)", marginBottom: "20px" }}>
                Choose the type that best describes its primary function on Somnia.
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {AGENT_TYPES.map(type => {
                  const active = form.agentType === type.value;
                  return (
                    <button
                      key={type.value}
                      onClick={() => { set("agentType", type.value); setError(null); }}
                      style={{
                        padding: "16px", borderRadius: "10px", cursor: "pointer", textAlign: "left",
                        border: active ? "1px solid var(--vael-purple)" : "1px solid var(--vael-border)",
                        background: active ? "rgba(124,111,255,0.08)" : "var(--vael-bg)",
                        transition: "all 0.15s",
                      }}
                    >
                      <div style={{ fontSize: "20px", marginBottom: "6px" }}>{type.icon}</div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: active ? "var(--vael-purple)" : "var(--vael-text-1)", marginBottom: "3px" }}>
                        {type.label}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--vael-text-3)", lineHeight: 1.4 }}>
                        {type.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Step 1: Identity ───────────────────────────────────────────── */}
          {step === 1 && (
            <div style={{ animation: "fade-in 0.2s ease", display: "flex", flexDirection: "column", gap: "18px" }}>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--vael-text-1)", marginBottom: "4px" }}>
                  On-chain identity
                </div>
                <div style={{ fontSize: "13px", color: "var(--vael-text-3)" }}>
                  These values are written directly to <code style={{ fontFamily: "monospace", color: "var(--vael-text-2)" }}>VaelRegistry.sol</code> and cannot be changed after registration.
                </div>
              </div>

              <FieldGroup>
                <Label hint="bytes32, 0x-prefixed">Agent ID</Label>
                <Input
                  value={form.agentId}
                  onChange={v => set("agentId", v)}
                  placeholder="0x0000000000000000000000000000000000000000000000000000000000000001"
                  mono
                />
                <span style={{ fontSize: "11px", color: "var(--vael-text-3)" }}>
                  32-byte identifier — usually a hash of your agent's address + salt. Must be unique on-chain.
                </span>
              </FieldGroup>

              <FieldGroup>
                <Label hint="checksummed preferred">Owner wallet</Label>
                <Input
                  value={form.owner}
                  onChange={v => set("owner", v)}
                  placeholder="0x..."
                  mono
                />
                <span style={{ fontSize: "11px", color: "var(--vael-text-3)" }}>
                  The EOA or multisig that controls this agent. Will be able to deactivate or update metadata.
                </span>
              </FieldGroup>

              {/* Agent type display (read-only, set in step 0) */}
              <FieldGroup>
                <Label>Agent type</Label>
                <div style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  padding: "10px 12px", borderRadius: "8px",
                  background: "var(--vael-bg)", border: "1px solid var(--vael-border)",
                }}>
                  <span style={{ fontSize: "16px" }}>{selectedType?.icon}</span>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--vael-text-1)" }}>{selectedType?.label}</span>
                  <button
                    onClick={() => setStep(0)}
                    style={{
                      marginLeft: "auto", background: "transparent", border: "none",
                      color: "var(--vael-purple)", fontSize: "12px", cursor: "pointer",
                    }}
                  >Change</button>
                </div>
              </FieldGroup>
            </div>
          )}

          {/* ── Step 2: Profile ────────────────────────────────────────────── */}
          {step === 2 && (
            <div style={{ animation: "fade-in 0.2s ease", display: "flex", flexDirection: "column", gap: "18px" }}>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--vael-text-1)", marginBottom: "4px" }}>
                  Profile <span style={{ fontSize: "12px", color: "var(--vael-text-3)", fontWeight: 400 }}>— optional</span>
                </div>
                <div style={{ fontSize: "13px", color: "var(--vael-text-3)" }}>
                  Metadata stored off-chain and shown in the Vael Explorer. You can update this later.
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <FieldGroup>
                  <Label>Display name</Label>
                  <Input value={form.name} onChange={v => set("name", v)} placeholder="My Trading Agent" />
                </FieldGroup>
                <FieldGroup>
                  <Label>Image URL</Label>
                  <Input value={form.imageUrl} onChange={v => set("imageUrl", v)} placeholder="https://..." />
                </FieldGroup>
              </div>

              <FieldGroup>
                <Label hint="max 280 chars">Description</Label>
                <Textarea
                  value={form.description}
                  onChange={v => set("description", v)}
                  placeholder="Describe what this agent does, how it behaves, and what protocols it interacts with..."
                />
              </FieldGroup>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <FieldGroup>
                  <Label>Model</Label>
                  <Input value={form.model} onChange={v => set("model", v)} placeholder="e.g. claude-3-5-sonnet" />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginTop: "2px" }}>
                    {MODEL_SUGGESTIONS.map(m => (
                      <button key={m} onClick={() => set("model", m)} style={{
                        padding: "2px 8px", borderRadius: "5px", fontSize: "11px", cursor: "pointer",
                        border: form.model === m ? "1px solid var(--vael-teal)" : "1px solid var(--vael-border)",
                        background: form.model === m ? "rgba(45,212,191,0.1)" : "var(--vael-bg)",
                        color: form.model === m ? "var(--vael-teal)" : "var(--vael-text-3)",
                      }}>{m}</button>
                    ))}
                  </div>
                </FieldGroup>

                <FieldGroup>
                  <Label>Framework</Label>
                  <Input value={form.framework} onChange={v => set("framework", v)} placeholder="e.g. LangChain" />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginTop: "2px" }}>
                    {FRAMEWORK_SUGGESTIONS.map(f => (
                      <button key={f} onClick={() => set("framework", f)} style={{
                        padding: "2px 8px", borderRadius: "5px", fontSize: "11px", cursor: "pointer",
                        border: form.framework === f ? "1px solid var(--vael-teal)" : "1px solid var(--vael-border)",
                        background: form.framework === f ? "rgba(45,212,191,0.1)" : "var(--vael-bg)",
                        color: form.framework === f ? "var(--vael-teal)" : "var(--vael-text-3)",
                      }}>{f}</button>
                    ))}
                  </div>
                </FieldGroup>
              </div>

              {/* Capabilities */}
              <FieldGroup>
                <Label hint="select all that apply">Capabilities</Label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
                  {CAPABILITY_OPTIONS.map(cap => {
                    const active = form.capabilities.includes(cap);
                    return (
                      <button
                        key={cap}
                        onClick={() => toggleCapability(cap)}
                        style={{
                          padding: "5px 12px", borderRadius: "7px", fontSize: "12px", cursor: "pointer",
                          border: active ? "1px solid var(--vael-purple)" : "1px solid var(--vael-border)",
                          background: active ? "rgba(124,111,255,0.12)" : "var(--vael-bg)",
                          color: active ? "var(--vael-purple)" : "var(--vael-text-3)",
                          fontWeight: active ? 600 : 400, transition: "all 0.12s",
                        }}
                      >{cap}</button>
                    );
                  })}
                </div>

                {/* Custom capability input */}
                <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                  <input
                    type="text"
                    value={capInput}
                    onChange={e => setCapInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addCustomCap()}
                    placeholder="Add custom capability..."
                    style={{
                      flex: 1, padding: "8px 12px", borderRadius: "7px",
                      background: "var(--vael-bg)", border: "1px solid var(--vael-border)",
                      color: "var(--vael-text-1)", fontSize: "12px", outline: "none",
                    }}
                  />
                  <button
                    onClick={addCustomCap}
                    disabled={!capInput.trim()}
                    style={{
                      padding: "8px 14px", borderRadius: "7px", fontSize: "12px",
                      border: "1px solid var(--vael-border)", background: "var(--vael-bg-card)",
                      color: "var(--vael-text-2)", cursor: "pointer",
                    }}
                  >+ Add</button>
                </div>
              </FieldGroup>

              <FieldGroup>
                <Label hint="optional">Metadata URI</Label>
                <Input
                  value={form.metadataUri}
                  onChange={v => set("metadataUri", v)}
                  placeholder="ipfs://... or https://..."
                />
                <span style={{ fontSize: "11px", color: "var(--vael-text-3)" }}>
                  A URI pointing to a JSON file with extended agent metadata (ERC-721 compatible).
                </span>
              </FieldGroup>
            </div>
          )}

          {/* ── Step 3: Confirm ────────────────────────────────────────────── */}
          {step === 3 && (
            <div style={{ animation: "fade-in 0.2s ease", display: "flex", flexDirection: "column", gap: "18px" }}>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--vael-text-1)", marginBottom: "4px" }}>
                  Review and register
                </div>
                <div style={{ fontSize: "13px", color: "var(--vael-text-3)" }}>
                  Once submitted, the agent ID and owner are permanently written to{" "}
                  <code style={{ fontFamily: "monospace", color: "var(--vael-text-2)" }}>VaelRegistry.sol</code>.
                </div>
              </div>

              {/* Summary */}
              <div style={{
                background: "var(--vael-bg)", border: "1px solid var(--vael-border)",
                borderRadius: "12px", padding: "16px",
                display: "flex", flexDirection: "column", gap: "10px",
              }}>
                <SummaryRow label="Agent ID"    value={form.agentId}    mono />
                <SummaryRow label="Owner"       value={form.owner}      mono />
                <SummaryRow label="Type"        value={selectedType ? `${selectedType.icon} ${selectedType.label}` : "—"} />
                {form.name        && <SummaryRow label="Name"        value={form.name} />}
                {form.model       && <SummaryRow label="Model"       value={form.model} />}
                {form.framework   && <SummaryRow label="Framework"   value={form.framework} />}
                {form.capabilities.length > 0 && (
                  <SummaryRow label="Capabilities" value={form.capabilities.join(", ")} />
                )}
                {form.metadataUri && <SummaryRow label="Metadata URI" value={form.metadataUri} mono />}
              </div>

              {/* Notice */}
              <div style={{
                background: "rgba(124,111,255,0.06)", border: "1px solid rgba(124,111,255,0.2)",
                borderRadius: "10px", padding: "14px 16px",
                display: "flex", gap: "12px", alignItems: "flex-start",
              }}>
                <span style={{ fontSize: "16px", flexShrink: 0 }}>💡</span>
                <div style={{ fontSize: "12px", color: "var(--vael-text-2)", lineHeight: 1.6 }}>
                  After registration, use the{" "}
                  <code style={{ fontFamily: "monospace" }}>@vael/sdk</code> or the API to log activities,
                  issue a Passport, and build reputation for this agent.
                </div>
              </div>
            </div>
          )}

          {/* ── Error ──────────────────────────────────────────────────────── */}
          {error && (
            <div style={{
              marginTop: "16px", padding: "12px 14px", borderRadius: "8px",
              background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)",
              fontSize: "13px", color: "var(--vael-red)",
            }}>
              {error}
            </div>
          )}

          {/* ── Navigation ─────────────────────────────────────────────────── */}
          <div style={{ display: "flex", gap: "10px", marginTop: "28px" }}>
            {step > 0 && (
              <button
                onClick={back}
                style={{
                  padding: "11px 20px", borderRadius: "8px",
                  border: "1px solid var(--vael-border)", background: "transparent",
                  color: "var(--vael-text-2)", fontSize: "13px", cursor: "pointer",
                }}
              >← Back</button>
            )}
            {step < STEPS.length - 1 ? (
              <button
                onClick={next}
                style={{
                  flex: 1, padding: "11px", borderRadius: "8px", border: "none",
                  background: "var(--vael-purple)", color: "#fff",
                  fontSize: "13px", fontWeight: 600, cursor: "pointer",
                }}
              >Continue →</button>
            ) : (
              <button
                onClick={submit}
                disabled={submitting}
                style={{
                  flex: 1, padding: "11px", borderRadius: "8px", border: "none",
                  background: submitting ? "var(--vael-purple-dim)" : "var(--vael-purple)",
                  color: "#fff", fontSize: "13px", fontWeight: 600,
                  cursor: submitting ? "not-allowed" : "pointer",
                  transition: "background 0.15s",
                }}
              >{submitting ? "Registering..." : "Register Agent"}</button>
            )}
          </div>
        </div>

        {/* ── Right: info sidebar ────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

          {/* What gets created */}
          <div style={{
            background: "var(--vael-bg-card)", border: "1px solid var(--vael-border)",
            borderRadius: "14px", padding: "18px",
          }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--vael-text-3)", marginBottom: "14px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
              What gets created
            </div>
            {[
              { icon: "🆔", title: "On-chain identity",     desc: "A bytes32 agent ID permanently recorded on Somnia via VaelRegistry." },
              { icon: "📒", title: "Activity ledger",       desc: "An immutable log of every action your agent takes, anchored on-chain." },
              { icon: "🪪", title: "Passport (optional)",   desc: "Issue a Vael Passport after registration to unlock reputation scoring." },
            ].map(item => (
              <div key={item.title} style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                <span style={{ fontSize: "16px", flexShrink: 0 }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--vael-text-1)", marginBottom: "2px" }}>{item.title}</div>
                  <div style={{ fontSize: "11px", color: "var(--vael-text-3)", lineHeight: 1.5 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* SDK snippet */}
          <div style={{
            background: "var(--vael-bg-card)", border: "1px solid var(--vael-border)",
            borderRadius: "14px", padding: "18px",
          }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--vael-text-3)", marginBottom: "12px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
              Prefer code?
            </div>
            <div style={{ fontSize: "11px", color: "var(--vael-text-3)", marginBottom: "10px" }}>
              Register directly with the <code style={{ fontFamily: "monospace", color: "var(--vael-text-2)" }}>@vael/sdk</code>:
            </div>
            <div style={{
              background: "var(--vael-bg)", borderRadius: "8px", padding: "12px",
              fontSize: "11px", fontFamily: "monospace", color: "var(--vael-text-2)", lineHeight: 1.8,
            }}>
              <span style={{ color: "#7c6fff" }}>import</span>{" { VaelClient } from \"@vael/sdk\";"}<br />
              <br />
              <span style={{ color: "#7c6fff" }}>const</span>{" client = new VaelClient({ "}<br />
              {"  rpcUrl: SOMNIA_RPC,"}<br />
              {"  signer: mySigner,"}<br />
              {"});"}<br />
              <br />
              <span style={{ color: "#7c6fff" }}>await</span>{" client.registry.register({"}<br />
              {"  agentId, agentType,"}<br />
              {"  metadataUri,"}<br />
              {"});"}<br />
            </div>
          </div>

          {/* Docs link */}
          <div style={{
            background: "rgba(45,212,191,0.06)", border: "1px solid rgba(45,212,191,0.2)",
            borderRadius: "12px", padding: "14px 16px",
          }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--vael-teal)", marginBottom: "4px" }}>
              New to Vael?
            </div>
            <div style={{ fontSize: "11px", color: "var(--vael-text-3)", lineHeight: 1.5 }}>
              Read the{" "}
              <a href="https://github.com/davife2025/Vael" target="_blank" rel="noreferrer"
                style={{ color: "var(--vael-teal)", textDecoration: "none" }}>
                protocol documentation →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}