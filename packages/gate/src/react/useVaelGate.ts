"use client";
import { useState, useEffect, useCallback } from "react";
import { evaluatePolicy, clearCache } from "../VaelGate";
import type { GatePolicy, GateResult, VaelGateConfig } from "../types";

interface UseVaelGateOptions {
  /** Agent ID to verify */
  agentId: string | null;
  /** Gate policy to apply */
  policy?: GatePolicy;
  /** VaelGate config */
  config: VaelGateConfig;
  /** Auto-verify on mount and agentId change. Default: true */
  autoVerify?: boolean;
}

interface UseVaelGateReturn {
  result:   GateResult | null;
  loading:  boolean;
  error:    string | null;
  allowed:  boolean;
  verify:   () => Promise<void>;
  reset:    () => void;
}

/**
 * useVaelGate — React hook for client-side Vael Passport verification.
 *
 * Usage:
 * ─────────────────────────────────────────────────────────
 * const { allowed, result, loading } = useVaelGate({
 *   agentId: "0x...",
 *   policy:  { minReputation: 300, requireVerified: false },
 *   config:  { apiUrl: "https://api.vael.xyz" },
 * });
 *
 * if (loading)  return <Spinner />;
 * if (!allowed) return <AccessDenied reason={result?.reason} />;
 * return <ProtectedContent />;
 * ─────────────────────────────────────────────────────────
 */
export function useVaelGate({
  agentId,
  policy     = {},
  config,
  autoVerify = true,
}: UseVaelGateOptions): UseVaelGateReturn {
  const [result,  setResult]  = useState<GateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const verify = useCallback(async () => {
    if (!agentId) {
      setResult(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await evaluatePolicy(agentId, policy, config);
      setResult(res);
    } catch (err: any) {
      setError(err.message ?? "Verification failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [agentId, JSON.stringify(policy), config.apiUrl]);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setLoading(false);
    clearCache();
  }, []);

  useEffect(() => {
    if (autoVerify) verify();
  }, [verify, autoVerify]);

  return {
    result,
    loading,
    error,
    allowed: result?.allowed === true,
    verify,
    reset,
  };
}
