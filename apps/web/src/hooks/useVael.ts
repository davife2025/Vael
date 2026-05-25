/**
 * useVael — React hook wrapping VaelClient for component-level agent queries
 * Full implementation in Session 5
 *
 * Usage (Session 5):
 *   const { agent, passport, ledger, loading } = useVael(agentId);
 */
export function useVael(_agentId?: string) {
  return {
    agent: null,
    passport: null,
    ledger: [],
    loading: false,
    error: null,
  };
}

export function useVaelStats() {
  return {
    totalAgents: 0,
    totalActivities: 0,
    totalPassports: 0,
    loading: false,
  };
}
