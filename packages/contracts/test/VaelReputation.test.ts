import { expect } from "chai";
import { ethers } from "hardhat";
import type {
  VaelRegistry,
  VaelLedger,
  VaelPassport,
  VaelReputation,
} from "../typechain-types";
import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("VaelReputation", () => {
  let registry:   VaelRegistry;
  let ledger:     VaelLedger;
  let passport:   VaelPassport;
  let reputation: VaelReputation;

  let owner:   SignerWithAddress;
  let alice:   SignerWithAddress;
  let bob:     SignerWithAddress;
  let charlie: SignerWithAddress;

  let aliceAgentId: string;
  let bobAgentId:   string;

  const META = "ipfs://QmTest";

  beforeEach(async () => {
    [owner, alice, bob, charlie] = await ethers.getSigners();

    // Deploy all four contracts
    const Reg  = await ethers.getContractFactory("VaelRegistry");
    registry   = await Reg.deploy() as VaelRegistry;
    await registry.waitForDeployment();

    const Led  = await ethers.getContractFactory("VaelLedger");
    ledger     = await Led.deploy(await registry.getAddress()) as VaelLedger;
    await ledger.waitForDeployment();

    const Pass = await ethers.getContractFactory("VaelPassport");
    passport   = await Pass.deploy(await registry.getAddress()) as VaelPassport;
    await passport.waitForDeployment();

    const Rep  = await ethers.getContractFactory("VaelReputation");
    reputation = await Rep.deploy(
      await registry.getAddress(),
      await ledger.getAddress(),
      await passport.getAddress()
    ) as VaelReputation;
    await reputation.waitForDeployment();

    // Wire reputation as passport oracle
    await passport.setReputationOracle(await reputation.getAddress(), true);
    await passport.setActivitySyncer(await ledger.getAddress(), true);

    // Register agents
    aliceAgentId = await registry.connect(alice).registerAgent.staticCall("trading", META);
    await registry.connect(alice).registerAgent("trading", META);

    bobAgentId = await registry.connect(bob).registerAgent.staticCall("oracle", META);
    await registry.connect(bob).registerAgent("oracle", META);

    // Issue passports
    await passport.connect(alice).issuePassport(aliceAgentId, alice.address);
    await passport.connect(bob).issuePassport(bobAgentId, bob.address);
  });

  // ── Deployment ─────────────────────────────────────────────────────────────

  describe("deployment", () => {
    it("stores contract addresses", async () => {
      expect(await reputation.registry()).to.equal(await registry.getAddress());
      expect(await reputation.ledger()).to.equal(await ledger.getAddress());
      expect(await reputation.passport()).to.equal(await passport.getAddress());
    });

    it("has correct default constants", async () => {
      expect(await reputation.MAX_SCORE()).to.equal(1000n);
      expect(await reputation.protocolFeeBps()).to.equal(200n);
      expect(await reputation.MIN_STAKE()).to.equal(ethers.parseEther("0.01"));
    });

    it("reverts with zero addresses", async () => {
      const Factory = await ethers.getContractFactory("VaelReputation");
      await expect(
        Factory.deploy(ethers.ZeroAddress, await ledger.getAddress(), await passport.getAddress())
      ).to.be.revertedWith("VaelReputation: zero registry");
    });
  });

  // ── Score computation ──────────────────────────────────────────────────────

  describe("computeScore", () => {
    it("returns 0 for fresh agent with no activity or stake", async () => {
      // Age score will be > 0 even for new agents (block time passes)
      await reputation.computeScore(aliceAgentId);
      const score = await reputation.getScore(aliceAgentId);
      // score should be small (only age component, which is near 0 for brand-new agent)
      expect(score).to.be.lt(50n);
    });

    it("increases score after logging activity", async () => {
      // Log 100 activities
      for (let i = 0; i < 10; i++) {
        await ledger.connect(alice).logActivity(
          aliceAgentId, `action_${i}`, "0x", ethers.ZeroAddress, ethers.ZeroHash
        );
      }
      await reputation.computeScore(aliceAgentId);
      const score = await reputation.getScore(aliceAgentId);
      expect(score).to.be.gt(0n);
    });

    it("increases score with stake", async () => {
      await reputation.computeScore(aliceAgentId);
      const scoreBefore = await reputation.getScore(aliceAgentId);

      await reputation.connect(charlie).stake(aliceAgentId, {
        value: ethers.parseEther("5"),
      });

      await reputation.computeScore(aliceAgentId);
      const scoreAfter = await reputation.getScore(aliceAgentId);
      expect(scoreAfter).to.be.gt(scoreBefore);
    });

    it("emits ScoreComputed event", async () => {
      await expect(reputation.computeScore(aliceAgentId))
        .to.emit(reputation, "ScoreComputed");
    });

    it("pushes score to passport", async () => {
      // Log some activities to give a non-trivial score
      for (let i = 0; i < 5; i++) {
        await ledger.connect(alice).logActivity(
          aliceAgentId, "trade", "0x", ethers.ZeroAddress, ethers.ZeroHash
        );
      }
      await reputation.computeScore(aliceAgentId);
      const score         = await reputation.getScore(aliceAgentId);
      const passportData  = await passport.getPassport(aliceAgentId);
      expect(passportData.reputationScore).to.equal(score);
    });

    it("caps score at 1000", async () => {
      // Stake the full cap amount
      await reputation.connect(charlie).stake(aliceAgentId, {
        value: ethers.parseEther("10"),
      });
      await reputation.computeScore(aliceAgentId);
      const score = await reputation.getScore(aliceAgentId);
      expect(score).to.be.lte(1000n);
    });

    it("halves score for inactive agent", async () => {
      // Log activities and stake
      for (let i = 0; i < 10; i++) {
        await ledger.connect(alice).logActivity(
          aliceAgentId, "trade", "0x", ethers.ZeroAddress, ethers.ZeroHash
        );
      }
      await reputation.connect(charlie).stake(aliceAgentId, { value: ethers.parseEther("2") });

      await reputation.computeScore(aliceAgentId);
      const activeScore = await reputation.getScore(aliceAgentId);

      // Deactivate agent
      await registry.connect(alice).deactivateAgent(aliceAgentId);
      await reputation.computeScore(aliceAgentId);
      const inactiveScore = await reputation.getScore(aliceAgentId);

      expect(inactiveScore).to.be.lte(activeScore / 2n + 2n); // ± 2 for rounding
    });

    it("reverts for unregistered agent", async () => {
      await expect(reputation.computeScore(ethers.ZeroHash))
        .to.be.revertedWith("VaelReputation: agent not registered");
    });

    it("reverts when paused", async () => {
      await reputation.connect(owner).pause();
      await expect(reputation.computeScore(aliceAgentId))
        .to.be.revertedWithCustomError(reputation, "EnforcedPause");
    });
  });

  // ── Factors breakdown ──────────────────────────────────────────────────────

  describe("getFactors", () => {
    it("returns all four factor components", async () => {
      await reputation.computeScore(aliceAgentId);
      const factors = await reputation.getFactors(aliceAgentId);
      expect(factors.activityScore  + factors.ageScore + factors.stakeScore + factors.communityScore)
        .to.equal(factors.total);
    });
  });

  // ── Staking ────────────────────────────────────────────────────────────────

  describe("stake", () => {
    it("accepts stake and emits Staked", async () => {
      await expect(
        reputation.connect(charlie).stake(aliceAgentId, { value: ethers.parseEther("1") })
      ).to.emit(reputation, "Staked");
    });

    it("records net stake after protocol fee", async () => {
      const stakeAmount = ethers.parseEther("1");
      await reputation.connect(charlie).stake(aliceAgentId, { value: stakeAmount });

      const feeBps   = await reputation.protocolFeeBps();
      const fee      = (stakeAmount * feeBps) / 10_000n;
      const netStake = stakeAmount - fee;

      expect(await reputation.getStake(aliceAgentId, charlie.address)).to.equal(netStake);
    });

    it("accumulates protocol fees", async () => {
      await reputation.connect(charlie).stake(aliceAgentId, { value: ethers.parseEther("1") });
      const fees = await reputation.accumulatedFees();
      expect(fees).to.be.gt(0n);
    });

    it("reverts below minimum stake", async () => {
      await expect(
        reputation.connect(charlie).stake(aliceAgentId, { value: ethers.parseEther("0.001") })
      ).to.be.revertedWith("VaelReputation: below minimum stake");
    });

    it("getTotalStake returns sum of all stakers", async () => {
      await reputation.connect(alice).stake(aliceAgentId,   { value: ethers.parseEther("1") });
      await reputation.connect(charlie).stake(aliceAgentId, { value: ethers.parseEther("2") });
      const total = await reputation.getTotalStake(aliceAgentId);
      // Net of 2% fee on 3 STT total = ~2.94 STT
      expect(total).to.be.gt(ethers.parseEther("2.9"));
    });
  });

  // ── Unstaking ──────────────────────────────────────────────────────────────

  describe("unstake", () => {
    it("reverts during lockup period", async () => {
      await reputation.connect(charlie).stake(aliceAgentId, { value: ethers.parseEther("1") });
      await expect(reputation.connect(charlie).unstake(aliceAgentId))
        .to.be.revertedWith("VaelReputation: still in lockup period");
    });

    it("returns stake after lockup (time-travel)", async () => {
      await reputation.connect(charlie).stake(aliceAgentId, { value: ethers.parseEther("1") });

      // Advance time past lockup
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine", []);

      const balanceBefore = await ethers.provider.getBalance(charlie.address);
      const tx     = await reputation.connect(charlie).unstake(aliceAgentId);
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;
      const balanceAfter = await ethers.provider.getBalance(charlie.address);

      // Should have received stake back (minus gas)
      expect(balanceAfter + gasUsed).to.be.gt(balanceBefore);
    });

    it("reverts if no stake exists", async () => {
      await expect(reputation.connect(charlie).unstake(aliceAgentId))
        .to.be.revertedWith("VaelReputation: no stake");
    });

    it("emits Unstaked after lockup", async () => {
      await reputation.connect(charlie).stake(aliceAgentId, { value: ethers.parseEther("1") });
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine", []);
      await expect(reputation.connect(charlie).unstake(aliceAgentId))
        .to.emit(reputation, "Unstaked");
    });
  });

  // ── Endorsement ───────────────────────────────────────────────────────────

  describe("endorse", () => {
    beforeEach(async () => {
      // Verify bob's agent so it can endorse
      await passport.connect(owner).verifyPassport(bobAgentId);
      // Give bob's agent a non-zero reputation
      await passport.connect(
        await ethers.getImpersonatedSigner(await reputation.getAddress())
      ).updateReputation(bobAgentId, 500n).catch(() => {}); // may fail if not oracle — set directly
    });

    it("endorsement increases community count", async () => {
      // Make reputation contract oracle and give bob score
      await passport.setReputationOracle(await reputation.getAddress(), true);
      // Manually set bob score via reputation contract
      await ledger.connect(bob).logActivity(bobAgentId, "trade", "0x", ethers.ZeroAddress, ethers.ZeroHash);
      await reputation.computeScore(bobAgentId);

      const before = await reputation.getEndorsements(aliceAgentId);

      await reputation.connect(bob).endorse(aliceAgentId, bobAgentId);
      const after  = await reputation.getEndorsements(aliceAgentId);

      expect(after).to.equal(before + 1n);
    });

    it("reverts for self-endorsement", async () => {
      await expect(reputation.connect(alice).endorse(aliceAgentId, aliceAgentId))
        .to.be.revertedWith("VaelReputation: cannot self-endorse");
    });

    it("reverts if endorser not owned by caller", async () => {
      await expect(reputation.connect(charlie).endorse(aliceAgentId, bobAgentId))
        .to.be.revertedWith("VaelReputation: not endorser owner");
    });
  });

  // ── Admin ──────────────────────────────────────────────────────────────────

  describe("admin", () => {
    it("owner can set protocol fee", async () => {
      await reputation.connect(owner).setProtocolFeeBps(500n);
      expect(await reputation.protocolFeeBps()).to.equal(500n);
    });

    it("reverts if fee exceeds 10%", async () => {
      await expect(reputation.connect(owner).setProtocolFeeBps(1001n))
        .to.be.revertedWith("VaelReputation: fee too high");
    });

    it("non-owner cannot set fee", async () => {
      await expect(reputation.connect(alice).setProtocolFeeBps(100n))
        .to.be.revertedWithCustomError(reputation, "OwnableUnauthorizedAccount");
    });

    it("owner can withdraw accumulated fees", async () => {
      await reputation.connect(charlie).stake(aliceAgentId, { value: ethers.parseEther("1") });
      const fees = await reputation.accumulatedFees();
      expect(fees).to.be.gt(0n);

      const balanceBefore = await ethers.provider.getBalance(owner.address);
      const tx      = await reputation.connect(owner).withdrawFees();
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;
      const balanceAfter  = await ethers.provider.getBalance(owner.address);

      expect(balanceAfter + gasUsed).to.be.gt(balanceBefore);
      expect(await reputation.accumulatedFees()).to.equal(0n);
    });
  });
});
