import { expect } from "chai";
import { ethers } from "hardhat";
import type { VaelRegistry, VaelPassport } from "../typechain-types";
import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("VaelPassport", () => {
  let registry: VaelRegistry;
  let passport: VaelPassport;
  let owner: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let reputationOracle: SignerWithAddress;
  let activitySyncer: SignerWithAddress;

  let aliceAgentId: string;

  const AGENT_TYPE   = "trading";
  const METADATA_URI = "ipfs://QmVaelTestMetadata";

  beforeEach(async () => {
    [owner, alice, bob, reputationOracle, activitySyncer] = await ethers.getSigners();

    const RegistryFactory = await ethers.getContractFactory("VaelRegistry");
    registry = await RegistryFactory.deploy() as VaelRegistry;
    await registry.waitForDeployment();

    const PassportFactory = await ethers.getContractFactory("VaelPassport");
    passport = await PassportFactory.deploy(await registry.getAddress()) as VaelPassport;
    await passport.waitForDeployment();

    // Grant oracle and syncer roles
    await passport.connect(owner).setReputationOracle(reputationOracle.address, true);
    await passport.connect(owner).setActivitySyncer(activitySyncer.address, true);

    // Register alice's agent
    aliceAgentId = await registry.connect(alice).registerAgent.staticCall(AGENT_TYPE, METADATA_URI);
    await registry.connect(alice).registerAgent(AGENT_TYPE, METADATA_URI);
  });

  // ── Deployment ─────────────────────────────────────────────────────────────

  describe("deployment", () => {
    it("has correct name and symbol", async () => {
      expect(await passport.name()).to.equal("Vael Agent Passport");
      expect(await passport.symbol()).to.equal("VAELPASS");
    });

    it("stores registry address", async () => {
      expect(await passport.registry()).to.equal(await registry.getAddress());
    });

    it("is soulbound by default", async () => {
      expect(await passport.soulbound()).to.be.true;
    });

    it("reverts with zero registry address", async () => {
      const Factory = await ethers.getContractFactory("VaelPassport");
      await expect(Factory.deploy(ethers.ZeroAddress))
        .to.be.revertedWith("VaelPassport: zero registry address");
    });
  });

  // ── Issue Passport ─────────────────────────────────────────────────────────

  describe("issuePassport", () => {
    it("issues a passport and emits PassportIssued", async () => {
      await expect(passport.connect(alice).issuePassport(aliceAgentId, alice.address))
        .to.emit(passport, "PassportIssued")
        .withArgs(aliceAgentId, 1n, alice.address);
    });

    it("mints an ERC-721 token to the owner", async () => {
      await passport.connect(alice).issuePassport(aliceAgentId, alice.address);
      expect(await passport.ownerOf(1n)).to.equal(alice.address);
      expect(await passport.balanceOf(alice.address)).to.equal(1n);
    });

    it("stores correct passport data", async () => {
      await passport.connect(alice).issuePassport(aliceAgentId, alice.address);
      const p = await passport.getPassport(aliceAgentId);
      expect(p.agentId).to.equal(aliceAgentId);
      expect(p.tokenId).to.equal(1n);
      expect(p.reputationScore).to.equal(0n);
      expect(p.totalActions).to.equal(0n);
      expect(p.verified).to.be.false;
      expect(p.issuedAt).to.be.gt(0n);
    });

    it("increments totalPassports", async () => {
      expect(await passport.totalPassports()).to.equal(0n);
      await passport.connect(alice).issuePassport(aliceAgentId, alice.address);
      expect(await passport.totalPassports()).to.equal(1n);
    });

    it("hasPassport returns true after issuance", async () => {
      await passport.connect(alice).issuePassport(aliceAgentId, alice.address);
      expect(await passport.hasPassport(aliceAgentId)).to.be.true;
    });

    it("hasPassport returns false before issuance", async () => {
      expect(await passport.hasPassport(aliceAgentId)).to.be.false;
    });

    it("reverts if passport already issued", async () => {
      await passport.connect(alice).issuePassport(aliceAgentId, alice.address);
      await expect(passport.connect(alice).issuePassport(aliceAgentId, alice.address))
        .to.be.revertedWith("VaelPassport: passport already issued");
    });

    it("reverts for unregistered agent", async () => {
      await expect(passport.connect(alice).issuePassport(ethers.ZeroHash, alice.address))
        .to.be.revertedWith("VaelPassport: agent not registered");
    });

    it("reverts for non-owner caller", async () => {
      await expect(passport.connect(bob).issuePassport(aliceAgentId, alice.address))
        .to.be.revertedWith("VaelPassport: not authorised to issue");
    });

    it("token IDs are sequential starting from 1", async () => {
      const bobAgentId = await registry.connect(bob).registerAgent.staticCall(AGENT_TYPE, METADATA_URI);
      await registry.connect(bob).registerAgent(AGENT_TYPE, METADATA_URI);

      await passport.connect(alice).issuePassport(aliceAgentId, alice.address);
      await passport.connect(bob).issuePassport(bobAgentId, bob.address);

      const p1 = await passport.getPassport(aliceAgentId);
      const p2 = await passport.getPassport(bobAgentId);
      expect(p1.tokenId).to.equal(1n);
      expect(p2.tokenId).to.equal(2n);
    });
  });

  // ── Soulbound ──────────────────────────────────────────────────────────────

  describe("soulbound", () => {
    beforeEach(async () => {
      await passport.connect(alice).issuePassport(aliceAgentId, alice.address);
    });

    it("reverts on transfer attempt when soulbound", async () => {
      await expect(
        passport.connect(alice).transferFrom(alice.address, bob.address, 1n)
      ).to.be.revertedWith("VaelPassport: passport is soulbound and non-transferable");
    });

    it("allows transfer after soulbound is disabled by owner", async () => {
      await passport.connect(owner).setSoulbound(false);
      await expect(
        passport.connect(alice).transferFrom(alice.address, bob.address, 1n)
      ).to.not.be.reverted;
      expect(await passport.ownerOf(1n)).to.equal(bob.address);
    });
  });

  // ── Reputation ─────────────────────────────────────────────────────────────

  describe("updateReputation", () => {
    beforeEach(async () => {
      await passport.connect(alice).issuePassport(aliceAgentId, alice.address);
    });

    it("updates reputation score and emits ReputationUpdated", async () => {
      await expect(passport.connect(reputationOracle).updateReputation(aliceAgentId, 750n))
        .to.emit(passport, "ReputationUpdated")
        .withArgs(aliceAgentId, 0n, 750n);

      const p = await passport.getPassport(aliceAgentId);
      expect(p.reputationScore).to.equal(750n);
    });

    it("reverts if called by non-oracle", async () => {
      await expect(passport.connect(bob).updateReputation(aliceAgentId, 500n))
        .to.be.revertedWith("VaelPassport: not a reputation oracle");
    });

    it("reverts if score exceeds 1000", async () => {
      await expect(passport.connect(reputationOracle).updateReputation(aliceAgentId, 1001n))
        .to.be.revertedWith("VaelPassport: score exceeds 1000");
    });

    it("allows score of exactly 1000", async () => {
      await expect(passport.connect(reputationOracle).updateReputation(aliceAgentId, 1000n))
        .to.not.be.reverted;
    });

    it("reverts for agent with no passport", async () => {
      const bobAgentId = await registry.connect(bob).registerAgent.staticCall(AGENT_TYPE, METADATA_URI);
      await registry.connect(bob).registerAgent(AGENT_TYPE, METADATA_URI);
      await expect(passport.connect(reputationOracle).updateReputation(bobAgentId, 500n))
        .to.be.revertedWith("VaelPassport: no passport for agent");
    });
  });

  // ── Activity Sync ──────────────────────────────────────────────────────────

  describe("syncActivity", () => {
    beforeEach(async () => {
      await passport.connect(alice).issuePassport(aliceAgentId, alice.address);
    });

    it("syncs totalActions and lastActivityAt", async () => {
      const now = Math.floor(Date.now() / 1000);
      await passport.connect(activitySyncer).syncActivity(aliceAgentId, 42n, BigInt(now));

      const p = await passport.getPassport(aliceAgentId);
      expect(p.totalActions).to.equal(42n);
      expect(p.lastActivityAt).to.equal(BigInt(now));
    });

    it("reverts if called by non-syncer", async () => {
      await expect(passport.connect(bob).syncActivity(aliceAgentId, 1n, 1n))
        .to.be.revertedWith("VaelPassport: not an activity syncer");
    });
  });

  // ── Verification ───────────────────────────────────────────────────────────

  describe("verifyPassport", () => {
    beforeEach(async () => {
      await passport.connect(alice).issuePassport(aliceAgentId, alice.address);
    });

    it("marks passport as verified", async () => {
      await passport.connect(owner).verifyPassport(aliceAgentId);
      const p = await passport.getPassport(aliceAgentId);
      expect(p.verified).to.be.true;
    });

    it("emits PassportVerified", async () => {
      await expect(passport.connect(owner).verifyPassport(aliceAgentId))
        .to.emit(passport, "PassportVerified")
        .withArgs(aliceAgentId);
    });

    it("reverts if called by non-owner", async () => {
      await expect(passport.connect(alice).verifyPassport(aliceAgentId))
        .to.be.revertedWithCustomError(passport, "OwnableUnauthorizedAccount");
    });
  });

  // ── Reverse lookup ─────────────────────────────────────────────────────────

  describe("getPassportByToken", () => {
    it("returns passport by tokenId", async () => {
      await passport.connect(alice).issuePassport(aliceAgentId, alice.address);
      const p = await passport.getPassportByToken(1n);
      expect(p.agentId).to.equal(aliceAgentId);
    });

    it("reverts for unknown tokenId", async () => {
      await expect(passport.getPassportByToken(999n))
        .to.be.revertedWith("VaelPassport: token not found");
    });
  });

  // ── Pause ──────────────────────────────────────────────────────────────────

  describe("pause", () => {
    it("reverts issuePassport when paused", async () => {
      await passport.connect(owner).pause();
      await expect(passport.connect(alice).issuePassport(aliceAgentId, alice.address))
        .to.be.revertedWithCustomError(passport, "EnforcedPause");
    });

    it("resumes after unpause", async () => {
      await passport.connect(owner).pause();
      await passport.connect(owner).unpause();
      await expect(passport.connect(alice).issuePassport(aliceAgentId, alice.address))
        .to.not.be.reverted;
    });
  });
});
