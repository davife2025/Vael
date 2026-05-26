import { describe, it, expect, vi, beforeEach } from "vitest";
import { uploadMetadata, resolveMetadata } from "../ipfs";
import type { AgentMetadata } from "../types";

const mockMetadata: AgentMetadata = {
  name:         "TestAgent",
  description:  "A test agent for Vael",
  capabilities: ["swap", "stake"],
  model:        "claude-3-sonnet",
  framework:    "eliza",
};

describe("uploadMetadata", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("uses Pinata when credentials are provided", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok:   true,
        json: () => Promise.resolve({ IpfsHash: "QmMockHash123" }),
      } as any)
    );

    const uri = await uploadMetadata(mockMetadata, {
      pinataApiKey:    "test-key",
      pinataApiSecret: "test-secret",
    });

    expect(uri).toBe("ipfs://QmMockHash123");
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("throws when Pinata returns an error", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok:   false,
        text: () => Promise.resolve("Unauthorized"),
      } as any)
    );

    await expect(
      uploadMetadata(mockMetadata, {
        pinataApiKey:    "bad-key",
        pinataApiSecret: "bad-secret",
      })
    ).rejects.toThrow("Pinata upload failed");
  });

  it("falls back to web3.storage without credentials", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok:   true,
        json: () => Promise.resolve({ cid: "bafyMockCid" }),
      } as any)
    );

    const uri = await uploadMetadata(mockMetadata);
    expect(uri).toBe("ipfs://bafyMockCid");
  });

  it("throws when fallback also fails", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: false, text: () => Promise.resolve("error") } as any)
    );

    await expect(uploadMetadata(mockMetadata)).rejects.toThrow();
  });
});

describe("resolveMetadata", () => {
  it("fetches and parses metadata from IPFS URI", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok:   true,
        json: () => Promise.resolve(mockMetadata),
      } as any)
    );

    const result = await resolveMetadata("ipfs://QmMockHash123");
    expect(result).toEqual(mockMetadata);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://ipfs.io/ipfs/QmMockHash123"
    );
  });

  it("uses custom gateway when provided", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok:   true,
        json: () => Promise.resolve(mockMetadata),
      } as any)
    );

    await resolveMetadata("ipfs://QmTest", "https://gateway.pinata.cloud/ipfs/");
    expect(global.fetch).toHaveBeenCalledWith(
      "https://gateway.pinata.cloud/ipfs/QmTest"
    );
  });

  it("returns null on fetch failure", async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error("network error")));
    const result = await resolveMetadata("ipfs://QmBadHash");
    expect(result).toBeNull();
  });

  it("returns null on non-ok response", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: false } as any)
    );
    const result = await resolveMetadata("ipfs://QmNotFound");
    expect(result).toBeNull();
  });
});
