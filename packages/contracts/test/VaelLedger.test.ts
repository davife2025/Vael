import { expect } from "chai";
import { ethers } from "hardhat";
import type { VaelRegistry, VaelLedger } from "../typechain-types";
import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("VaelLedger", () => {
  let registry: VaelRegistry;
  let ledger: VaelLedger;
  let owner: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let authorisedLogger: SignerWithAddress;

  let aliceAgentId: string;

  const AGENT_TYPE   = "trading";
  const METADATA_URI = "ipfs://QmVaelTestMetadata";
  const ACTION       = "trade";
  const PAYLOAD      = ethers.toUtf8Bytes('{"token":"STT","amount":"100"}');
  const CONDITION    = ethers.keccak256(ethers.toUtf8Bytes("price > 1.5"));

  beforeEach(async () => {
    [owner, alice, bob, authorisedLogger] = await ethers.getSigners();

    const RegistryFactory = await ethers.getContractFactory("VaelRegistry");
    registry = await RegistryFactory.deploy() as VaelRegistry;
    await registry.waitForDeployment();

    const LedgerFactory = await ethers.getContractFactory("VaelLedger");
    ledger = await LedgerFactory.deploy(await registry.getAddress()) as VaelLedger;
    await ledger.waitForDeployment();

    // Register alice's agent
    aliceAgentId = await registry.connect(alice).registerAgent.staticCall(AGENT_TYPE, METADATA_URI);
    await registry.connect(alice).registerAgent(AGENT_TYPE, METADATA_URI);
  });

  // ── Deployment ─────────────────────────────────────────────────────────────

  describe("deployment", () => {
    it("stores the registry address", async () => {
      expect(await ledger.registry()).to.equal(await registry.getAddress());
    });

    it("starts with zero global total", async () => {
      expect(await ledger.globalTotal()).to.equal(0n);
    });

    it("reverts with zero registry address", async () => {
      const Factory = await ethers.getContractFactory("VaelLedger");
      await expect(Factory.deploy(ethers.ZeroAddress))
        .to.be.revertedWith("VaelLedger: zero registry address");
    });
  });

  // ── Log Activity ───────────────────────────────────────────────────────────

  describe("logActivity", () => {
    it("logs an activity entry and emits ActivityLogged", async () => {
      await expect(
        ledger.connect(alice).logActivity(
          aliceAgentId, ACTION, PAYLOAD, ethers.ZeroAddress, CONDITION
        )
      ).to.emit(ledger, "ActivityLogged")
       .withArgs(aliceAgentId, 0n, ACTION, await ethers.provider.getBlock("latest").then(b => b!.timestamp + 1));
    });

    it("returns correct sequential entryId", async () => {
      const id0 = await ledger.connect(alice).logActivity.staticCall(
        aliceAgentId, ACTION, PAYLOAD, ethers.ZeroAddress, CONDITION
      );
      await ledger.connect(alice).logActivity(aliceAgentId, ACTION, PAYLOAD, ethers.ZeroAddress, CONDITION);

      const id1 = await ledger.connect(alice).logActivity.staticCall(
        aliceAgentId, ACTION, PAYLOAD, ethers.ZeroAddress, CONDITION
      );
      expect(id0).to.equal(0n);
      expect(id1).to.equal(1n);
    });

    it("stores correct entry data", async () => {
      await ledger.connect(alice).logActivity(
        aliceAgentId, ACTION, PAYLOAD, bob.address, CONDITION
      );
      const entry = await ledger.getEntry(aliceAgentId, 0n);
      expect(entry.agentId).to.equal(aliceAgentId);
      expect(entry.action).to.equal(ACTION);
      expect(entry.target).to.equal(bob.address);
      expect(entry.conditionHash).to.equal(CONDITION);
      expect(entry.entryId).to.equal(0n);
    });

    it("increments globalTotal", async () => {
      await ledger.connect(alice).logActivity(aliceAgentId, ACTION, PAYLOAD, ethers.ZeroAddress, CONDITION);
      expect(await ledger.globalTotal()).to.equal(1n);
      await ledger.connect(alice).logActivity(aliceAgentId, "vote", PAYLOAD, ethers.ZeroAddress, CONDITION);
      expect(await ledger.globalTotal()).to.equal(2n);
    });

    it("increments agent entry count", async () => {
      expect(await ledger.getTotalEntries(aliceAgentId)).to.equal(0n);
      await ledger.connect(alice).logActivity(aliceAgentId, ACTION, PAYLOAD, ethers.ZeroAddress, CONDITION);
      expect(await ledger.getTotalEntries(aliceAgentId)).to.equal(1n);
    });

    it("allows authorised logger to log on behalf of agent", async () => {
      await ledger.connect(owner).authoriseLogger(authorisedLogger.address, true);
      await expect(
        ledger.connect(authorisedLogger).logActivity(
          aliceAgentId, ACTION, PAYLOAD, ethers.ZeroAddress, CONDITION
        )
      ).to.emit(ledger, "ActivityLogged");
    });

    it("reverts for unregistered agent", async () => {
      await expect(
        ledger.connect(alice).logActivity(
          ethers.ZeroHash, ACTION, PAYLOAD, ethers.ZeroAddress, CONDITION
        )
      ).to.be.revertedWith("VaelLedger: agent not registered");
    });

    it("reverts for non-owner, non-authorised caller", async () => {
      await expect(
        ledger.connect(bob).logActivity(
          aliceAgentId, ACTION, PAYLOAD, ethers.ZeroAddress, CONDITION
        )
      ).to.be.revertedWith("VaelLedger: not authorised to log");
    });

    it("reverts for inactive agent", async () => {
      await registry.connect(alice).deactivateAgent(aliceAgentId);
      await expect(
        ledger.connect(alice).logActivity(
          aliceAgentId, ACTION, PAYLOAD, ethers.ZeroAddress, CONDITION
        )
      ).to.be.revertedWith("VaelLedger: agent is inactive");
    });

    it("reverts with empty action", async () => {
      await expect(
        ledger.connect(alice).logActivity(
          aliceAgentId, "", PAYLOAD, ethers.ZeroAddress, CONDITION
        )
      ).to.be.revertedWith("VaelLedger: action required");
    });

    it("reverts when paused", async () => {
      await ledger.connect(owner).pause();
      await expect(
        ledger.connect(alice).logActivity(
          aliceAgentId, ACTION, PAYLOAD, ethers.ZeroAddress, CONDITION
        )
      ).to.be.revertedWithCustomError(ledger, "EnforcedPause");
    });
  });

  // ── Queries ────────────────────────────────────────────────────────────────

  describe("getRecentEntries", () => {
    beforeEach(async () => {
      for (let i = 0; i < 5; i++) {
        await ledger.connect(alice).logActivity(
          aliceAgentId, `action_${i}`, PAYLOAD, ethers.ZeroAddress, CONDITION
        );
      }
    });

    it("returns most recent entries newest first", async () => {
      const entries = await ledger.getRecentEntries(aliceAgentId, 3n);
      expect(entries.length).to.equal(3);
      expect(entries[0].action).to.equal("action_4");
      expect(entries[1].action).to.equal("action_3");
      expect(entries[2].action).to.equal("action_2");
    });

    it("returns all entries if count exceeds total", async () => {
      const entries = await ledger.getRecentEntries(aliceAgentId, 100n);
      expect(entries.length).to.equal(5);
    });

    it("returns empty array for agent with no entries", async () => {
      const bobAgentId = await registry.connect(bob).registerAgent.staticCall(AGENT_TYPE, METADATA_URI);
      await registry.connect(bob).registerAgent(AGENT_TYPE, METADATA_URI);
      const entries = await ledger.getRecentEntries(bobAgentId, 10n);
      expect(entries.length).to.equal(0);
    });
  });

  describe("getEntriesPaginated", () => {
    beforeEach(async () => {
      for (let i = 0; i < 10; i++) {
        await ledger.connect(alice).logActivity(
          aliceAgentId, `action_${i}`, PAYLOAD, ethers.ZeroAddress, CONDITION
        );
      }
    });

    it("paginates correctly", async () => {
      const page1 = await ledger.getEntriesPaginated(aliceAgentId, 0n, 5n);
      const page2 = await ledger.getEntriesPaginated(aliceAgentId, 5n, 5n);
      expect(page1.length).to.equal(5);
      expect(page2.length).to.equal(5);
      expect(page1[0].action).to.equal("action_0");
      expect(page2[0].action).to.equal("action_5");
    });

    it("returns empty for offset beyond total", async () => {
      const entries = await ledger.getEntriesPaginated(aliceAgentId, 100n, 10n);
      expect(entries.length).to.equal(0);
    });
  });
});
