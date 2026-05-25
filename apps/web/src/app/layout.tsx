import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vael — Agent Infrastructure Protocol",
  description: "Every agent has a story. Vael makes it visible. The canonical agent registry and ledger for Somnia.",
  openGraph: {
    title: "Vael",
    description: "The agent infrastructure protocol for Somnia's Agentic L1",
    siteName: "Vael",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Providers added in Session 5: WagmiProvider, QueryClientProvider */}
        {children}
      </body>
    </html>
  );
}
