import {
  type PublicClient,
  type WalletClient,
  type Hash,
  type Hex,
  encodeAbiParameters,
  parseAbiParameters,
  keccak256,
  toBytes,
} from "viem";
import { VAEL_REGISTRY_ABI, VAEL_PASSPORT_ABI } from "./abis";
import { uploadMetadata } from "./ipfs";
import type {
  RegisterAgentParams,
  RegisterAgentResult,
  VaelConfig,
} from "./types";

/**
 * registerAgent
 *
 * Registers a new AI agent on Somnia via VaelRegistry.
 * Workflow:
 *   1. Upload metadata JSON to IPFS → get metadataURI
 *   2. Fetch current registration fee from contract
 *   3. Call registerAgent() on VaelRegistry → get agentId from receipt logs
 *   4. Optionally issue a VaelPassport ERC-721 for the agent
 *
 * Returns agentId, txHash, and optionally passportTokenId.
 */
export async function registerAgent(
  params:       RegisterAgentParams,
  config:       VaelConfig,
  publicClient: PublicClient,
  walletClient: WalletClient,
): Promise<RegisterAgentResult> {
  const { agentType, metadata, issuePassport = true } = params;
  const [account] = await walletClient.getAddresses();

  // ── 1. Upload metadata to IPFS ───────────────────────────────────────────
  let metadataURI: string;
  try {
    metadataURI = await uploadMetadata(metadata, {
      pinataApiKey:    (config as any).pinataApiKey,
      pinataApiSecret: (config as any).pinataApiSecret,
    });
  } catch {
    // Fallback: store a data URI for testnet (not for production)
    const encoded = Buffer.from(JSON.stringify(metadata)).toString("base64");
    metadataURI   = `data:application/json;base64,${encoded}`;
    console.warn(
      "[vael-sdk] IPFS upload failed. Using data URI fallback — configure Pinata for production."
    );
  }

  // ── 2. Fetch registration fee ────────────────────────────────────────────
  const fee = await publicClient.readContract({
    address:      config.contracts.registry,
    abi:          VAEL_REGISTRY_ABI,
    functionName: "registrationFee",
  }) as bigint;

  // ── 3. Register agent ────────────────────────────────────────────────────
  const txHash = await walletClient.writeContract({
    address:      config.contracts.registry,
    abi:          VAEL_REGISTRY_ABI,
    functionName: "registerAgent",
    args:         [agentType, metadataURI],
    value:        fee,
    account,
    chain:        walletClient.chain ?? null,
  });

  // ── 4. Wait for receipt + extract agentId from logs ─────────────────────
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  // Parse AgentRegistered event from logs
  let agentId: Hex | undefined;
  for (const log of receipt.logs) {
    try {
      const decoded = decodeAgentRegisteredLog(log);
      if (decoded) { agentId = decoded; break; }
    } catch { /* not our event */ }
  }

  if (!agentId) {
    throw new Error(
      `registerAgent: could not find AgentRegistered event in tx ${txHash}. ` +
      `The transaction may have succeeded — check the registry for your wallet's agents.`
    );
  }

  // ── 5. Issue passport (optional) ─────────────────────────────────────────
  let passportTokenId: bigint | undefined;

  if (issuePassport) {
    try {
      const passportTx = await walletClient.writeContract({
        address:      config.contracts.passport,
        abi:          VAEL_PASSPORT_ABI,
        functionName: "issuePassport",
        args:         [agentId, account],
        account,
        chain:        walletClient.chain ?? null,
      });

      const passportReceipt = await publicClient.waitForTransactionReceipt({
        hash: passportTx,
      });

      // Extract tokenId from PassportIssued log
      for (const log of passportReceipt.logs) {
        const tokenId = decodePassportIssuedLog(log);
        if (tokenId !== undefined) {
          passportTokenId = tokenId;
          break;
        }
      }
    } catch (err) {
      console.warn("[vael-sdk] Passport issuance failed (agent registered successfully):", err);
    }
  }

  return { agentId, txHash, passportTokenId };
}

// ── Log decoders ─────────────────────────────────────────────────────────────

function decodeAgentRegisteredLog(log: any): Hex | undefined {
  // AgentRegistered(bytes32 indexed agentId, ...)
  // topic[0] = event sig, topic[1] = agentId (indexed bytes32)
  const SIG = keccak256(toBytes("AgentRegistered(bytes32,address,string,uint256)"));
  if (log.topics?.[0] !== SIG) return undefined;
  return log.topics[1] as Hex;
}

function decodePassportIssuedLog(log: any): bigint | undefined {
  // PassportIssued(bytes32 indexed agentId, uint256 indexed tokenId, address indexed owner)
  const SIG = keccak256(toBytes("PassportIssued(bytes32,uint256,address)"));
  if (log.topics?.[0] !== SIG) return undefined;
  return BigInt(log.topics[2]);
}
