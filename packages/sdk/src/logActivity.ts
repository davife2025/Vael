import {
  type PublicClient,
  type WalletClient,
  type Address,
  type Hex,
  encodeAbiParameters,
  parseAbiParameters,
  keccak256,
  toBytes,
  toHex,
} from "viem";
import { VAEL_LEDGER_ABI } from "./abis";
import type { VaelConfig, LogActivityParams } from "./types";

/**
 * logActivity
 *
 * Writes an activity entry to the VaelLedger for a registered agent.
 * Only callable by the agent owner or an authorised logger.
 *
 * Returns the sequential entryId assigned by the contract.
 */
export async function logActivity(
  params:       LogActivityParams,
  config:       VaelConfig,
  publicClient: PublicClient,
  walletClient: WalletClient,
): Promise<bigint> {
  const {
    agentId,
    action,
    payload      = new Uint8Array(0),
    target       = "0x0000000000000000000000000000000000000000",
    condition,
  } = params;

  const [account] = await walletClient.getAddresses();

  // Hash the condition string if provided, else use bytes32(0)
  const conditionHash: Hex = condition
    ? keccak256(toBytes(condition))
    : "0x0000000000000000000000000000000000000000000000000000000000000000";

  // Encode payload if it's an object
  const encodedPayload: Hex = payload instanceof Uint8Array
    ? toHex(payload)
    : encodePayload(payload);

  const txHash = await walletClient.writeContract({
    address:      config.contracts.ledger,
    abi:          VAEL_LEDGER_ABI,
    functionName: "logActivity",
    args:         [agentId, action, encodedPayload, target as Address, conditionHash],
    account,
    chain:        walletClient.chain ?? null,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  // Extract entryId from ActivityLogged event
  const SIG = keccak256(toBytes("ActivityLogged(bytes32,uint256,string,uint256)"));
  for (const log of receipt.logs) {
    if (log.topics?.[0] === SIG && log.topics?.[1]) {
      return BigInt(log.topics[2]); // entryId is second indexed param
    }
  }

  throw new Error(`logActivity: could not extract entryId from tx ${txHash}`);
}

function encodePayload(data: Record<string, unknown>): Hex {
  try {
    return toHex(toBytes(JSON.stringify(data)));
  } catch {
    return "0x";
  }
}
