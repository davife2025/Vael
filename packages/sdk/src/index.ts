export { VaelClient } from "./VaelClient";
export * from "./types";

// Chain config helpers — implemented Session 4
export const SOMNIA_MAINNET = {
  id: 50312,
  name: "Somnia",
  rpcUrl: "https://dream-rpc.somnia.network",
} as const;

export const SOMNIA_TESTNET = {
  id: 50311,
  name: "Somnia Testnet",
  rpcUrl: "https://vsomnia-rpc.somnia.network",
} as const;
