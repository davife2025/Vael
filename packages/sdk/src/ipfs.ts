import type { AgentMetadata } from "./types";

export interface IpfsConfig {
  pinataApiKey?:    string;
  pinataApiSecret?: string;
  gateway?:         string; // default: https://ipfs.io/ipfs/
}

/**
 * uploadMetadata
 * Uploads AgentMetadata JSON to IPFS.
 * Uses Pinata if credentials are provided, otherwise falls back to
 * a public IPFS node (suitable for dev/testnet only).
 *
 * Returns the ipfs:// URI to store in the contract.
 */
export async function uploadMetadata(
  metadata: AgentMetadata,
  config: IpfsConfig = {}
): Promise<string> {
  const json = JSON.stringify(metadata, null, 2);

  // ── Pinata ────────────────────────────────────────────────────────────────
  if (config.pinataApiKey && config.pinataApiSecret) {
    const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method:  "POST",
      headers: {
        "Content-Type":      "application/json",
        "pinata_api_key":    config.pinataApiKey,
        "pinata_secret_api_key": config.pinataApiSecret,
      },
      body: JSON.stringify({
        pinataContent:  metadata,
        pinataMetadata: { name: metadata.name || "vael-agent-metadata" },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Pinata upload failed: ${err}`);
    }

    const data = await res.json() as { IpfsHash: string };
    return `ipfs://${data.IpfsHash}`;
  }

  // ── Public node fallback (dev only) ───────────────────────────────────────
  // Uses web3.storage public API — suitable for testnet, not production
  const res = await fetch("https://api.web3.storage/upload", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    json,
  });

  if (!res.ok) {
    throw new Error(
      "IPFS upload failed. Provide Pinata credentials via VaelClient config for production use."
    );
  }

  const data = await res.json() as { cid: string };
  return `ipfs://${data.cid}`;
}

/**
 * resolveMetadata
 * Fetches and parses AgentMetadata from an ipfs:// URI.
 */
export async function resolveMetadata(
  uri: string,
  gateway = "https://ipfs.io/ipfs/"
): Promise<AgentMetadata | null> {
  try {
    const cid  = uri.replace("ipfs://", "");
    const url  = `${gateway}${cid}`;
    const res  = await fetch(url);
    if (!res.ok) return null;
    return await res.json() as AgentMetadata;
  } catch {
    return null;
  }
}
