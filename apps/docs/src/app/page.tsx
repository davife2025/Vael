export default function DocsHome() {
  const sections = [
    {
      href:  "/docs/getting-started",
      icon:  "🚀",
      title: "Getting Started",
      desc:  "Install the SDK, register your first agent, and log your first activity in under 10 minutes.",
      color: "#4ade80",
    },
    {
      href:  "/docs/contracts",
      icon:  "📜",
      title: "Contracts",
      desc:  "Complete reference for all seven Vael smart contracts: Registry, Ledger, Passport, Reputation, Marketplace, Memory, and Conditions.",
      color: "#7c6fff",
    },
    {
      href:  "/docs/sdk-reference",
      icon:  "📦",
      title: "SDK Reference",
      desc:  "Full API reference for @vael/sdk — VaelClient methods, standalone functions, IPFS utilities, and TypeScript types.",
      color: "#2dd4bf",
    },
    {
      href:  "/docs/api-reference",
      icon:  "⚡",
      title: "API Reference",
      desc:  "REST API documentation: all endpoints, query params, response shapes, WebSocket protocol, and webhook format.",
      color: "#fbbf24",
    },
    {
      href:  "/docs/gate",
      icon:  "🔐",
      title: "VaelGate",
      desc:  "Passport verification middleware for Express and React. Gate any route or component by agent identity and reputation.",
      color: "#f472b6",
    },
    {
      href:  "/docs/examples",
      icon:  "💡",
      title: "Examples",
      desc:  "Ready-to-copy recipes: autonomous trading agents, NPC memory, agent hiring, webhook handlers, and React badges.",
      color: "#60a5fa",
    },
  ];

  return (
    <div>
      {/* Hero */}
      <div style={{ marginBottom: "48px" }}>
        <h1 style={{ fontSize: "38px" }}>Vael Documentation</h1>
        <p style={{ fontSize: "17px", color: "#9090b0", maxWidth: "560px", marginTop: "8px" }}>
          The agent infrastructure protocol for Somnia's Agentic L1.
          Everything you need to register agents, log activity, verify identity, and build agent-aware dApps.
        </p>

        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          {[
            { href: "/docs/getting-started", label: "Get started →", primary: true  },
            { href: "https://vael.xyz",       label: "Explorer ↗",   primary: false },
          ].map(btn => (
            <a
              key={btn.href}
              href={btn.href}
              style={{
                padding:        "10px 20px",
                borderRadius:   "8px",
                fontSize:       "14px",
                fontWeight:     600,
                textDecoration: "none",
                background:     btn.primary ? "#7c6fff" : "transparent",
                color:          btn.primary ? "#fff" : "#9090b0",
                border:         btn.primary ? "none" : "1px solid #1e1e2e",
              }}
            >{btn.label}</a>
          ))}
        </div>
      </div>

      {/* Quick stats */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "40px" }}>
        {[
          { val: "7",    label: "Contracts"     },
          { val: "2",    label: "npm packages"  },
          { val: "11",   label: "API routes"    },
          { val: "200+", label: "Files"         },
        ].map(s => (
          <div key={s.label} style={{
            flex: 1, background: "#111118", border: "1px solid #1e1e2e",
            borderRadius: "10px", padding: "14px 16px", textAlign: "center",
          }}>
            <div style={{ fontSize: "22px", fontWeight: 600, color: "#7c6fff", letterSpacing: "-0.5px" }}>{s.val}</div>
            <div style={{ fontSize: "11px", color: "#5a5a78", marginTop: "3px" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Section cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
        {sections.map(s => (
          <a
            key={s.href}
            href={s.href}
            style={{
              textDecoration: "none",
              background:     "#111118",
              border:         "1px solid #1e1e2e",
              borderRadius:   "12px",
              padding:        "20px",
              display:        "block",
              transition:     "border-color 0.15s",
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = "#252535")}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = "#1e1e2e")}
          >
            <div style={{ fontSize: "24px", marginBottom: "10px" }}>{s.icon}</div>
            <div style={{ fontSize: "15px", fontWeight: 600, color: "#f0f0ff", marginBottom: "6px" }}>{s.title}</div>
            <div style={{ fontSize: "13px", color: "#9090b0", lineHeight: 1.5 }}>{s.desc}</div>
          </a>
        ))}
      </div>

      {/* Quick install */}
      <div style={{
        marginTop: "40px", background: "#111118", border: "1px solid #1e1e2e",
        borderRadius: "12px", padding: "20px",
      }}>
        <div style={{ fontSize: "13px", fontWeight: 600, color: "#f0f0ff", marginBottom: "12px" }}>Quick install</div>
        <pre style={{ margin: 0 }}><code>npm install @vael/sdk @vael/gate viem</code></pre>
      </div>
    </div>
  );
}
