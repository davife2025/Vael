import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title:       { default: "Vael", template: "%s · Vael" },
  description: "Every agent has a story. Vael makes it visible. The canonical agent registry and ledger for Somnia.",
  openGraph: {
    title:       "Vael — Agent Infrastructure Protocol",
    description: "The canonical agent registry, ledger, and passport layer for Somnia's Agentic L1.",
    siteName:    "Vael",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 24px", minHeight: "calc(100vh - 60px)" }}>
          {children}
        </main>
        <footer style={{
          borderTop: "1px solid var(--vael-border)", padding: "20px 24px",
          textAlign: "center", fontSize: "12px", color: "var(--vael-text-3)",
        }}>
          Vael Protocol · Built on <a href="https://somnia.network" style={{ color: "var(--vael-purple)", textDecoration: "none" }}>Somnia</a>
          · Every agent has a story. Vael makes it visible.
        </footer>
      </body>
    </html>
  );
}
