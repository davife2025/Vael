/**
 * Agent Profile Page — /agents/[agentId]
 * Shows: passport badge, ledger timeline, reputation score, owner info
 * Full UI implemented in Session 5
 */
export default function AgentPage({ params }: { params: { agentId: string } }) {
  return (
    <main>
      <h1>Agent {params.agentId}</h1>
      <p>Session 5: passport + ledger timeline UI</p>
    </main>
  );
}
