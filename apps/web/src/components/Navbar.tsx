"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navbar() {
  const path = usePathname();

  const links = [
    { href: "/",            label: "Explorer" },
    { href: "/leaderboard", label: "Leaderboard" },
    { href: "/keys",        label: "API Keys" },
  ];

  return (
    <nav style={{
      borderBottom: "1px solid var(--vael-border)",
      background:   "rgba(10,10,15,0.95)",
      backdropFilter: "blur(12px)",
      position: "sticky", top: 0, zIndex: 50,
    }}>
      <div style={{
        maxWidth: "1200px", margin: "0 auto",
        padding: "0 24px",
        display: "flex", alignItems: "center",
        justifyContent: "space-between", height: "60px",
      }}>
        {/* Logo */}
        <Link href="/" style={{ textDecoration: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "28px", height: "28px", borderRadius: "8px",
              background: "linear-gradient(135deg, var(--vael-purple), var(--vael-teal))",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "14px", fontWeight: 700, color: "#fff",
            }}>V</div>
            <span style={{ fontWeight: 600, fontSize: "17px", color: "var(--vael-text-1)", letterSpacing: "-0.3px" }}>
              Vael
            </span>
            <span style={{
              fontSize: "10px", padding: "2px 7px", borderRadius: "20px",
              background: "var(--vael-purple-dim)", color: "var(--vael-purple)",
              fontWeight: 500, letterSpacing: "0.03em",
            }}>SOMNIA</span>
          </div>
        </Link>

        {/* Nav links */}
        <div style={{ display: "flex", gap: "4px" }}>
          {links.map(l => (
            <Link key={l.href} href={l.href} style={{
              textDecoration: "none",
              padding: "6px 14px", borderRadius: "8px", fontSize: "14px",
              fontWeight: 500,
              color:      path === l.href ? "var(--vael-text-1)" : "var(--vael-text-2)",
              background: path === l.href ? "var(--vael-bg-card)" : "transparent",
              border:     path === l.href ? "1px solid var(--vael-border)" : "1px solid transparent",
              transition: "all 0.15s",
            }}>{l.label}</Link>
          ))}
        </div>

        {/* Tagline */}
        <div style={{ fontSize: "12px", color: "var(--vael-text-3)", display: "flex", alignItems: "center", gap: "6px" }}>
          <div className="live-dot" />
          Live on Somnia
        </div>
      </div>
    </nav>
  );
}
