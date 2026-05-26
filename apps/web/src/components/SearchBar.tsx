"use client";
import { useRouter } from "next/navigation";
import { useSearch } from "@/hooks/useVael";
import { truncateAddress, truncateAgentId, getAgentTypeColor } from "@/lib/utils";

export function SearchBar() {
  const router = useRouter();
  const { query, setQuery, results, loading } = useSearch();

  function handleSelect(agentId: string) {
    setQuery("");
    router.push(`/agents/${agentId}`);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && results.length > 0) {
      handleSelect(results[0].id);
    }
  }

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: "600px", margin: "0 auto 32px" }}>
      {/* Input */}
      <div style={{
        display: "flex", alignItems: "center", gap: "10px",
        background: "var(--vael-bg-card)",
        border: "1px solid var(--vael-border-soft)",
        borderRadius: "12px", padding: "12px 16px",
        transition: "border-color 0.15s",
      }}>
        <svg width="16" height="16" fill="none" stroke="var(--vael-text-3)" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search by agent ID, wallet address, or type..."
          style={{
            flex: 1, background: "transparent", border: "none", outline: "none",
            color: "var(--vael-text-1)", fontSize: "14px",
          }}
        />
        {loading && (
          <div style={{
            width: "14px", height: "14px", border: "2px solid var(--vael-border)",
            borderTopColor: "var(--vael-purple)", borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }} />
        )}
      </div>

      {/* Results dropdown */}
      {results.length > 0 && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
          background: "var(--vael-bg-card)",
          border: "1px solid var(--vael-border)",
          borderRadius: "12px", overflow: "hidden",
          zIndex: 100, animation: "slide-up 0.15s ease",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}>
          {results.map((agent, i) => (
            <button
              key={agent.id}
              onClick={() => handleSelect(agent.id)}
              style={{
                width: "100%", padding: "12px 16px", background: "transparent",
                border: "none", borderBottom: i < results.length - 1 ? "1px solid var(--vael-border)" : "none",
                cursor: "pointer", textAlign: "left", display: "flex",
                alignItems: "center", gap: "12px",
                transition: "background 0.1s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--vael-bg-hover)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              {/* Type badge */}
              <div style={{
                width: "32px", height: "32px", borderRadius: "8px",
                background: getAgentTypeColor(agent.agentType) + "22",
                border: `1px solid ${getAgentTypeColor(agent.agentType)}44`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "11px", fontWeight: 600,
                color: getAgentTypeColor(agent.agentType),
                flexShrink: 0,
              }}>
                {(agent.agentType || "?")[0].toUpperCase()}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "13px", color: "var(--vael-text-1)", fontWeight: 500 }}>
                  {agent.name || truncateAgentId(agent.id)}
                </div>
                <div style={{ fontSize: "11px", color: "var(--vael-text-3)", fontFamily: "monospace" }}>
                  {truncateAddress(agent.owner)}
                </div>
              </div>

              <div style={{
                fontSize: "11px", padding: "2px 8px", borderRadius: "6px",
                background: getAgentTypeColor(agent.agentType) + "22",
                color: getAgentTypeColor(agent.agentType),
              }}>
                {agent.agentType}
              </div>
            </button>
          ))}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
