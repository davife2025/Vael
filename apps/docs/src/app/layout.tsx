import type { Metadata } from "next";

export const metadata: Metadata = {
  title:       { default: "Vael Docs", template: "%s — Vael Docs" },
  description: "Documentation for the Vael agent infrastructure protocol on Somnia.",
};

const NAV = [
  {
    group: "Start here",
    items: [
      { href: "/docs",                    label: "Introduction"    },
      { href: "/docs/getting-started",    label: "Getting Started" },
    ],
  },
  {
    group: "Protocol",
    items: [
      { href: "/docs/contracts",          label: "Contracts"       },
      { href: "/docs/contracts#registry", label: "VaelRegistry"   },
      { href: "/docs/contracts#ledger",   label: "VaelLedger"     },
      { href: "/docs/contracts#passport", label: "VaelPassport"   },
      { href: "/docs/contracts#reputation",label: "VaelReputation"},
      { href: "/docs/contracts#marketplace",label: "VaelMarketplace"},
      { href: "/docs/contracts#memory",   label: "VaelMemory"     },
      { href: "/docs/contracts#conditions",label: "VaelConditions"},
    ],
  },
  {
    group: "Developer",
    items: [
      { href: "/docs/sdk-reference",      label: "SDK Reference"  },
      { href: "/docs/api-reference",      label: "API Reference"  },
      { href: "/docs/gate",               label: "VaelGate"       },
      { href: "/docs/examples",           label: "Examples"       },
    ],
  },
  {
    group: "Resources",
    items: [
      { href: "https://vael.xyz",         label: "Explorer ↗"    },
      { href: "https://github.com/vael-protocol/vael", label: "GitHub ↗" },
      { href: "/docs/grant-application",  label: "Grant Application" },
    ],
  },
];

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif", background: "#0a0a0f", color: "#f0f0ff" }}>
        <div style={{ display: "flex", minHeight: "100vh" }}>

          {/* Sidebar */}
          <aside style={{
            width:     "240px", flexShrink: 0,
            borderRight: "1px solid #1e1e2e",
            padding:   "0",
            position:  "sticky", top: 0, height: "100vh",
            overflowY: "auto",
            background:"#0a0a0f",
          }}>
            {/* Logo */}
            <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid #1e1e2e" }}>
              <a href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: "26px", height: "26px", borderRadius: "7px",
                  background: "linear-gradient(135deg, #7c6fff, #2dd4bf)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "13px", fontWeight: 700, color: "#fff",
                }}>V</div>
                <span style={{ fontWeight: 600, fontSize: "15px", color: "#f0f0ff" }}>Vael Docs</span>
              </a>
            </div>

            {/* Nav */}
            <nav style={{ padding: "12px 0" }}>
              {NAV.map(group => (
                <div key={group.group} style={{ marginBottom: "20px" }}>
                  <div style={{ padding: "4px 20px 6px", fontSize: "11px", fontWeight: 600, color: "#5a5a78", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    {group.group}
                  </div>
                  {group.items.map(item => (
                    <a
                      key={item.href}
                      href={item.href}
                      style={{
                        display:      "block",
                        padding:      "6px 20px",
                        fontSize:     "13px",
                        color:        "#9090b0",
                        textDecoration:"none",
                        transition:   "color 0.1s",
                      }}
                      onMouseEnter={e => ((e.target as HTMLElement).style.color = "#f0f0ff")}
                      onMouseLeave={e => ((e.target as HTMLElement).style.color = "#9090b0")}
                    >
                      {item.label}
                    </a>
                  ))}
                </div>
              ))}
            </nav>

            {/* Version badge */}
            <div style={{ padding: "12px 20px", borderTop: "1px solid #1e1e2e", marginTop: "auto" }}>
              <span style={{ fontSize: "11px", padding: "3px 8px", borderRadius: "6px", background: "rgba(124,111,255,0.15)", color: "#7c6fff" }}>
                v0.1.0 — Somnia Testnet
              </span>
            </div>
          </aside>

          {/* Main content */}
          <main style={{ flex: 1, maxWidth: "820px", padding: "48px 56px", lineHeight: 1.75 }}>
            {children}
          </main>
        </div>

        <style>{`
          h1 { font-size: 32px; font-weight: 600; letter-spacing: -0.8px; color: #f0f0ff; margin: 0 0 8px; }
          h2 { font-size: 22px; font-weight: 600; color: #f0f0ff; margin: 40px 0 12px; padding-top: 20px; border-top: 1px solid #1e1e2e; }
          h3 { font-size: 17px; font-weight: 600; color: #f0f0ff; margin: 28px 0 10px; }
          p  { color: #9090b0; margin: 0 0 14px; }
          a  { color: #7c6fff; }
          code { font-family: "JetBrains Mono", monospace; font-size: 0.88em; background: #111118; padding: 2px 6px; border-radius: 5px; color: #2dd4bf; }
          pre  { background: #111118; border: 1px solid #1e1e2e; border-radius: 10px; padding: 18px 20px; overflow-x: auto; margin: 16px 0; }
          pre code { background: transparent; padding: 0; color: #e0e0f0; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; margin: 16px 0; }
          th { text-align: left; padding: 8px 12px; font-size: 12px; color: #5a5a78; border-bottom: 1px solid #1e1e2e; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
          td { padding: 10px 12px; font-size: 13px; color: #9090b0; border-bottom: 1px solid #1e1e2e; }
          td:first-child { color: #f0f0ff; font-weight: 500; }
          blockquote { border-left: 3px solid #7c6fff; margin: 16px 0; padding: 10px 16px; background: rgba(124,111,255,0.06); border-radius: 0 8px 8px 0; }
          blockquote p { color: #9090b0; margin: 0; }
          ul, ol { color: #9090b0; padding-left: 20px; margin: 0 0 14px; }
          li { margin-bottom: 4px; }
          hr { border: none; border-top: 1px solid #1e1e2e; margin: 32px 0; }
        `}</style>
      </body>
    </html>
  );
}
