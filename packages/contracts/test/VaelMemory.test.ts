import { expect } from "chai";
import { ethers } from "hardhat";
import type { VaelRegistry, VaelMemory } from "../typechain-types";
import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("VaelMemory", () => {
  let registry: VaelRegistry;
  let memory:   VaelMemory;
  let owner:    SignerWithAddress;
  let alice:    SignerWithAddress;
  let bob:      SignerWithAddress;
  let writer:   SignerWithAddress;

  let aliceAgentId: string;
  let bobAgentId:   string;

  const META = "ipfs://QmTest";

  beforeEach(async () => {
    [owner, alice, bob, writer] = await ethers.getSigners();

    const Reg = await ethers.getContractFactory("VaelRegistry");
    registry  = await Reg.deploy() as VaelRegistry;
    await registry.waitForDeployment();

    const Mem = await ethers.getContractFactory("VaelMemory");
    memory    = await Mem.deploy(await registry.getAddress()) as VaelMemory;
    await memory.waitForDeployment();

    aliceAgentId = await registry.connect(alice).registerAgent.staticCall("trading", META);
    await registry.connect(alice).registerAgent("trading", META);

    bobAgentId = await registry.connect(bob).registerAgent.staticCall("oracle", META);
    await registry.connect(bob).registerAgent("oracle", META);
  });

  // ── Deployment ─────────────────────────────────────────────────────────────

  describe("deployment", () => {
    it("stores registry address", async () => {
      expect(await memory.registry()).to.equal(await registry.getAddress());
    });

    it("reverts with zero registry", async () => {
      const Factory = await ethers.getContractFactory("VaelMemory");
      await expect(Factory.deploy(ethers.ZeroAddress))
        .to.be.revertedWith("VaelMemory: zero registry");
    });
  });

  // ── set / get raw bytes ────────────────────────────────────────────────────

  describe("set + get", () => {
    it("sets and gets a raw bytes value", async () => {
      const val = ethers.toUtf8Bytes("hello vael");
      await memory.connect(alice).set(aliceAgentId, "greeting", val);
      const entry = await memory.get(aliceAgentId, "greeting");
      expect(ethers.toUtf8String(entry.value)).to.equal("hello vael");
    });

    it("emits MemorySet with version 1 on first write", async () => {
      const val = ethers.toUtf8Bytes("test");
      await expect(memory.connect(alice).set(aliceAgentId, "k1", val))
        .to.emit(memory, "MemorySet")
        .withArgs(aliceAgentId, "k1", 1n, anyTimestamp());
    });

    it("increments version on update", async () => {
      const val = ethers.toUtf8Bytes("v1");
      await memory.connect(alice).set(aliceAgentId, "k1", val);
      await memory.connect(alice).set(aliceAgentId, "k1", ethers.toUtf8Bytes("v2"));
      const entry = await memory.get(aliceAgentId, "k1");
      expect(entry.version).to.equal(2n);
    });

    it("reverts for non-owner write", async () => {
      await expect(
        memory.connect(bob).set(aliceAgentId, "k1", ethers.toUtf8Bytes("v"))
      ).to.be.revertedWith("VaelMemory: not authorised to write");
    });

    it("reverts for empty key", async () => {
      await expect(
        memory.connect(alice).set(aliceAgentId, "", ethers.toUtf8Bytes("v"))
      ).to.be.revertedWith("VaelMemory: key required");
    });

    it("reverts for value exceeding MAX_VALUE_SIZE", async () => {
      const bigVal = new Uint8Array(4097);
      await expect(
        memory.connect(alice).set(aliceAgentId, "k1", bigVal)
      ).to.be.revertedWith("VaelMemory: value too large");
    });
  });

  // ── setString / getString ──────────────────────────────────────────────────

  describe("setString + getString", () => {
    it("stores and retrieves a string", async () => {
      await memory.connect(alice).setString(aliceAgentId, "model", "gpt-4o");
      expect(await memory.getString(aliceAgentId, "model")).to.equal("gpt-4o");
    });
  });

  // ── setUint / getUint ──────────────────────────────────────────────────────

  describe("setUint + getUint", () => {
    it("stores and retrieves a uint256", async () => {
      await memory.connect(alice).setUint(aliceAgentId, "balance", 999999n);
      expect(await memory.getUint(aliceAgentId, "balance")).to.equal(999999n);
    });
  });

  // ── setBool / getBool ──────────────────────────────────────────────────────

  describe("setBool + getBool", () => {
    it("stores and retrieves true", async () => {
      await memory.connect(alice).setBool(aliceAgentId, "active", true);
      expect(await memory.getBool(aliceAgentId, "active")).to.be.true;
    });

    it("stores and retrieves false", async () => {
      await memory.connect(alice).setBool(aliceAgentId, "paused", false);
      expect(await memory.getBool(aliceAgentId, "paused")).to.be.false;
    });
  });

  // ── has ────────────────────────────────────────────────────────────────────

  describe("has", () => {
    it("returns true for existing key", async () => {
      await memory.connect(alice).setString(aliceAgentId, "k1", "v");
      expect(await memory.has(aliceAgentId, "k1")).to.be.true;
    });

    it("returns false for missing key", async () => {
      expect(await memory.has(aliceAgentId, "missing")).to.be.false;
    });
  });

  // ── del ────────────────────────────────────────────────────────────────────

  describe("del", () => {
    it("deletes a key and emits MemoryDeleted", async () => {
      await memory.connect(alice).setString(aliceAgentId, "temp", "value");
      await expect(memory.connect(alice).del(aliceAgentId, "temp"))
        .to.emit(memory, "MemoryDeleted")
        .withArgs(aliceAgentId, "temp");
      expect(await memory.has(aliceAgentId, "temp")).to.be.false;
    });

    it("reverts delete on missing key", async () => {
      await expect(memory.connect(alice).del(aliceAgentId, "ghost"))
        .to.be.revertedWith("VaelMemory: key not found");
    });

    it("allows re-setting a deleted key", async () => {
      await memory.connect(alice).setString(aliceAgentId, "k1", "v1");
      await memory.connect(alice).del(aliceAgentId, "k1");
      await memory.connect(alice).setString(aliceAgentId, "k1", "v2");
      expect(await memory.getString(aliceAgentId, "k1")).to.equal("v2");
    });
  });

  // ── getKeys ────────────────────────────────────────────────────────────────

  describe("getKeys", () => {
    it("returns all live keys", async () => {
      await memory.connect(alice).setString(aliceAgentId, "a", "1");
      await memory.connect(alice).setString(aliceAgentId, "b", "2");
      await memory.connect(alice).setString(aliceAgentId, "c", "3");
      const keys = await memory.getKeys(aliceAgentId);
      expect(keys.length).to.equal(3);
      expect(keys).to.include("a");
      expect(keys).to.include("b");
      expect(keys).to.include("c");
    });

    it("excludes deleted keys", async () => {
      await memory.connect(alice).setString(aliceAgentId, "keep", "v");
      await memory.connect(alice).setString(aliceAgentId, "gone", "v");
      await memory.connect(alice).del(aliceAgentId, "gone");
      const keys = await memory.getKeys(aliceAgentId);
      expect(keys.length).to.equal(1);
      expect(keys[0]).to.equal("keep");
    });
  });

  // ── totalEntries ───────────────────────────────────────────────────────────

  describe("totalEntries", () => {
    it("tracks live entry count", async () => {
      expect(await memory.totalEntries(aliceAgentId)).to.equal(0n);
      await memory.connect(alice).setString(aliceAgentId, "a", "1");
      await memory.connect(alice).setString(aliceAgentId, "b", "2");
      expect(await memory.totalEntries(aliceAgentId)).to.equal(2n);
      await memory.connect(alice).del(aliceAgentId, "a");
      expect(await memory.totalEntries(aliceAgentId)).to.equal(1n);
    });
  });

  // ── authoriseWriter ────────────────────────────────────────────────────────

  describe("authoriseWriter", () => {
    it("authorised writer can write", async () => {
      await memory.connect(alice).authoriseWriter(aliceAgentId, writer.address, true);
      await expect(
        memory.connect(writer).setString(aliceAgentId, "k1", "from-writer")
      ).to.not.be.reverted;
      expect(await memory.getString(aliceAgentId, "k1")).to.equal("from-writer");
    });

    it("revoked writer cannot write", async () => {
      await memory.connect(alice).authoriseWriter(aliceAgentId, writer.address, true);
      await memory.connect(alice).authoriseWriter(aliceAgentId, writer.address, false);
      await expect(
        memory.connect(writer).setString(aliceAgentId, "k1", "v")
      ).to.be.revertedWith("VaelMemory: not authorised to write");
    });

    it("non-owner cannot authorise writers", async () => {
      await expect(
        memory.connect(bob).authoriseWriter(aliceAgentId, writer.address, true)
      ).to.be.revertedWith("VaelMemory: not agent owner");
    });

    it("emits WriterAuthorised", async () => {
      await expect(memory.connect(alice).authoriseWriter(aliceAgentId, writer.address, true))
        .to.emit(memory, "WriterAuthorised")
        .withArgs(aliceAgentId, writer.address, true);
    });
  });

  // ── namespace isolation ────────────────────────────────────────────────────

  describe("namespace isolation", () => {
    it("agent namespaces are isolated", async () => {
      await memory.connect(alice).setString(aliceAgentId, "key", "alice-value");
      await memory.connect(bob).setString(bobAgentId,    "key", "bob-value");
      expect(await memory.getString(aliceAgentId, "key")).to.equal("alice-value");
      expect(await memory.getString(bobAgentId,   "key")).to.equal("bob-value");
    });
  });
});

function anyTimestamp() {
  return (val: any) => typeof val === "bigint" && val > 0n;
}
