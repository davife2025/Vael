import { expect } from "chai";
import { ethers } from "hardhat";
import type { VaelRegistry, VaelLedger, VaelConditions } from "../typechain-types";
import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("VaelConditions", () => {
  let registry:   VaelRegistry;
  let ledger:     VaelLedger;
  let conditions: VaelConditions;

  let owner:  SignerWithAddress;
  let alice:  SignerWithAddress;
  let bob:    SignerWithAddress;
  let keeper: SignerWithAddress;

  let aliceAgentId: string;

  const META     = "ipfs://QmTest";
  const EVIDENCE = ethers.toUtf8Bytes('{"price":"2.05","timestamp":1716000000}');
  const EVIDENCE_HASH = ethers.keccak256(EVIDENCE);

  function makeProof(evidence = EVIDENCE) {
    return {
      conditionId:  0n,
      evidence,
      triggeredAt:  BigInt(Math.floor(Date.now() / 1000)),
      evidenceHash: ethers.keccak256(evidence),
    };
  }

  beforeEach(async () => {
    [owner, alice, bob, keeper] = await ethers.getSigners();

    const Reg = await ethers.getContractFactory("VaelRegistry");
    registry  = await Reg.deploy() as VaelRegistry;
    await registry.waitForDeployment();

    const Led = await ethers.getContractFactory("VaelLedger");
    ledger    = await Led.deploy(await registry.getAddress()) as VaelLedger;
    await ledger.waitForDeployment();

    const Cond = await ethers.getContractFactory("VaelConditions");
    conditions = await Cond.deploy(
      await registry.getAddress(),
      await ledger.getAddress()
    ) as VaelConditions;
    await conditions.waitForDeployment();

    // Authorise conditions contract as ledger logger
    await ledger.connect(owner).authoriseLogger(await conditions.getAddress(), true);

    // Authorise keeper
    await conditions.connect(owner).authoriseKeeper(keeper.address, true);

    // Register alice's agent
    aliceAgentId = await registry.connect(alice).registerAgent.staticCall("trading", META);
    await registry.connect(alice).registerAgent("trading", META);
  });

  // ── Deployment ─────────────────────────────────────────────────────────────

  describe("deployment", () => {
    it("stores contract references", async () => {
      expect(await conditions.registry()).to.equal(await registry.getAddress());
      expect(await conditions.ledger()).to.equal(await ledger.getAddress());
    });

    it("starts with zero conditions", async () => {
      expect(await conditions.totalConditions()).to.equal(0n);
    });
  });

  // ── registerCondition ──────────────────────────────────────────────────────

  describe("registerCondition", () => {
    it("registers a PRICE_THRESHOLD condition", async () => {
      const params = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "bool"], [ethers.parseEther("2"), true]
      );
      await expect(
        conditions.connect(alice).registerCondition(
          aliceAgentId, "price-above-2", 0, params, "price-alert", 10, 0
        )
      ).to.emit(conditions, "ConditionRegistered")
        .withArgs(1n, aliceAgentId, "price-above-2", 0);

      expect(await conditions.totalConditions()).to.equal(1n);
    });

    it("stores correct condition data", async () => {
      await conditions.connect(alice).registerCondition(
        aliceAgentId, "heartbeat", 1,
        ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [3600]),
        "heartbeat", 0, 0
      );
      const c = await conditions.getCondition(1n);
      expect(c.agentId).to.equal(aliceAgentId);
      expect(c.name).to.equal("heartbeat");
      expect(c.condType).to.equal(1); // TIME_INTERVAL
      expect(c.actionTag).to.equal("heartbeat");
      expect(c.status).to.equal(0); // ACTIVE
    });

    it("reverts for non-owner", async () => {
      await expect(
        conditions.connect(bob).registerCondition(
          aliceAgentId, "test", 4, "0x", "test", 0, 0
        )
      ).to.be.revertedWith("VaelConditions: not agent owner");
    });

    it("reverts with empty name", async () => {
      await expect(
        conditions.connect(alice).registerCondition(
          aliceAgentId, "", 4, "0x", "action", 0, 0
        )
      ).to.be.revertedWith("VaelConditions: name required");
    });

    it("links condition to agent", async () => {
      await conditions.connect(alice).registerCondition(
        aliceAgentId, "c1", 4, "0x", "action", 0, 0
      );
      await conditions.connect(alice).registerCondition(
        aliceAgentId, "c2", 4, "0x", "action", 0, 0
      );
      const ids = await conditions.getAgentConditions(aliceAgentId);
      expect(ids.length).to.equal(2);
    });
  });

  // ── triggerCondition ───────────────────────────────────────────────────────

  describe("triggerCondition", () => {
    beforeEach(async () => {
      await conditions.connect(alice).registerCondition(
        aliceAgentId, "price-alert", 0, "0x", "price-alert", 0, 0
      );
    });

    it("keeper triggers condition and emits event", async () => {
      await expect(conditions.connect(keeper).triggerCondition(1n, makeProof()))
        .to.emit(conditions, "ConditionTriggered")
        .withArgs(1n, aliceAgentId, 1n, EVIDENCE_HASH);
    });

    it("logs activity in VaelLedger on trigger", async () => {
      const entriesBefore = await ledger.getTotalEntries(aliceAgentId);
      await conditions.connect(keeper).triggerCondition(1n, makeProof());
      const entriesAfter  = await ledger.getTotalEntries(aliceAgentId);
      expect(entriesAfter).to.equal(entriesBefore + 1n);
    });

    it("increments triggerCount", async () => {
      await conditions.connect(keeper).triggerCondition(1n, makeProof());
      await conditions.connect(keeper).triggerCondition(1n, makeProof());
      const c = await conditions.getCondition(1n);
      expect(c.triggerCount).to.equal(2n);
    });

    it("reverts with invalid evidence hash", async () => {
      const badProof = { ...makeProof(), evidenceHash: ethers.ZeroHash };
      await expect(conditions.connect(keeper).triggerCondition(1n, badProof))
        .to.be.revertedWith("VaelConditions: invalid evidence hash");
    });

    it("reverts from non-keeper", async () => {
      await expect(conditions.connect(bob).triggerCondition(1n, makeProof()))
        .to.be.revertedWith("VaelConditions: not an authorised keeper");
    });

    it("auto-expires after maxTriggers", async () => {
      await conditions.connect(alice).registerCondition(
        aliceAgentId, "one-shot", 4, "0x", "action", 1, 0
      );
      await conditions.connect(keeper).triggerCondition(2n, makeProof());
      const c = await conditions.getCondition(2n);
      expect(c.status).to.equal(4); // EXPIRED
    });

    it("enforces TIME_INTERVAL cooldown", async () => {
      const params = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [3600]);
      await conditions.connect(alice).registerCondition(
        aliceAgentId, "hourly", 1, params, "heartbeat", 0, 0
      );
      await conditions.connect(keeper).triggerCondition(2n, makeProof());
      await expect(conditions.connect(keeper).triggerCondition(2n, makeProof()))
        .to.be.revertedWith("VaelConditions: interval not elapsed");
    });

    it("TIME_INTERVAL fires again after interval", async () => {
      const params = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [3600]);
      await conditions.connect(alice).registerCondition(
        aliceAgentId, "hourly", 1, params, "heartbeat", 0, 0
      );
      await conditions.connect(keeper).triggerCondition(2n, makeProof());

      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine", []);

      await expect(conditions.connect(keeper).triggerCondition(2n, makeProof()))
        .to.emit(conditions, "ConditionTriggered");
    });
  });

  // ── pause / resume / cancel ────────────────────────────────────────────────

  describe("lifecycle management", () => {
    beforeEach(async () => {
      await conditions.connect(alice).registerCondition(
        aliceAgentId, "test", 4, "0x", "action", 0, 0
      );
    });

    it("owner can pause and resume", async () => {
      await conditions.connect(alice).pauseCondition(1n);
      expect((await conditions.getCondition(1n)).status).to.equal(1); // PAUSED
      await conditions.connect(alice).resumeCondition(1n);
      expect((await conditions.getCondition(1n)).status).to.equal(0); // ACTIVE
    });

    it("reverts trigger on paused condition", async () => {
      await conditions.connect(alice).pauseCondition(1n);
      await expect(conditions.connect(keeper).triggerCondition(1n, makeProof()))
        .to.be.revertedWith("VaelConditions: condition not active");
    });

    it("owner can cancel", async () => {
      await conditions.connect(alice).cancelCondition(1n);
      expect((await conditions.getCondition(1n)).status).to.equal(5); // CANCELLED
    });

    it("non-owner cannot pause", async () => {
      await expect(conditions.connect(bob).pauseCondition(1n))
        .to.be.revertedWith("VaelConditions: not agent owner");
    });
  });
});
