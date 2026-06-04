// Core
export { evaluatePolicy, canPass, clearCache } from "./VaelGate";

// Types
export type {
  GatePolicy,
  GateResult,
  AgentRecord,
  VaelGateConfig,
} from "./types";
export { GateDenyReason } from "./types";

// React
export { useVaelGate }      from "./react/useVaelGate";
export { PassportVerifier } from "./react/PassportVerifier";

// Express
export { createExpressGate } from "./express/middleware";
export type { VaelRequest }  from "./express/middleware";
