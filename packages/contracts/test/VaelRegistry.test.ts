import { expect } from "chai";
import { ethers } from "hardhat";
import type { VaelRegistry } from "../typechain-types";
import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("VaelRegistry", () => {
  let registry: VaelRegistry;
  let owner: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;

  const AGENT_TYPE = "trading";
  const METADATA_URI = "ipfs://QmVaelTestMetadata";

  beforeEach(async () => {
    [owner, alice, bob] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("VaelRegistry");
    registry = await Factory.deploy() as VaelRegistry;
    await registry.waitForDeployment();
  });

  // ── Deployment ─────────────────────────────────────────────────────────────

  describe("deployment", () => {
    it("sets the deployer as owner", async () => {
      expect(await registry.owner()).to.equal(owner.address);
    });

    it("starts with zero agents", async () => {
      expect(await registry.totalAgents()).to.equal(0n);
    });

    it("starts with zero registration fee", async () => {
      expect(await registry.registrationFee()).to.equal(0n);
    });
  });

  // ── Registration ───────────────────────────────────────────────────────────

  describe("registerAgent", () => {
    it("registers an agent and emits AgentRegistered", async () => {
      const tx = await registry.connect(alice).registerAgent(AGENT_TYPE, METADATA_URI);
      const receipt = await tx.wait();
      const event = receipt?.logs.find((l: any) => l.fragment?.name === "AgentRegistered");
      expect(event).to.not.be.undefined;
    });

    it("returns a non-zero agentId", async () => {
      const tx = await registry.connect(alice).registerAgent.staticCall(AGENT_TYPE, METADATA_URI);
      expect(tx).to.not.equal(ethers.ZeroHash);
    });

    it("increments totalAgents", async () => {
      await registry.connect(alice).registerAgent(AGENT_TYPE, METADATA_URI);
      expect(await registry.totalAgents()).to.equal(1n);
      await registry.connect(alice).registerAgent("oracle", METADATA_URI);
      expect(await registry.totalAgents()).to.equal(2n);
    });

    it("stores correct agent data", async () => {
      const agentId = await registry.connect(alice).registerAgent.staticCall(AGENT_TYPE, METADATA_URI);
      await registry.connect(alice).registerAgent(AGENT_TYPE, METADATA_URI);

      const agent = await registry.getAgent(agentId);
      expect(agent.owner).to.equal(alice.address);
      expect(agent.agentType).to.equal(AGENT_TYPE);
      expect(agent.metadataURI).to.equal(METADATA_URI);
      expect(agent.active).to.be.true;
      expect(agent.createdAt).to.be.gt(0n);
    });

    it("generates unique IDs for the same owner", async () => {
      const id1 = await registry.connect(alice).registerAgent.staticCall(AGENT_TYPE, METADATA_URI);
      await registry.connect(alice).registerAgent(AGENT_TYPE, METADATA_URI);
      const id2 = await registry.connect(alice).registerAgent.staticCall(AGENT_TYPE, METADATA_URI);
      expect(id1).to.not.equal(id2);
    });

    it("generates unique IDs for different owners", async () => {
      const id1 = await registry.connect(alice).registerAgent.staticCall(AGENT_TYPE, METADATA_URI);
      const id2 = await registry.connect(bob).registerAgent.staticCall(AGENT_TYPE, METADATA_URI);
      expect(id1).to.not.equal(id2);
    });

    it("reverts with empty agentType", async () => {
      await expect(
        registry.connect(alice).registerAgent("", METADATA_URI)
      ).to.be.revertedWith("VaelRegistry: agentType required");
    });

    it("reverts with empty metadataURI", async () => {
      await expect(
        registry.connect(alice).registerAgent(AGENT_TYPE, "")
      ).to.be.revertedWith("VaelRegistry: metadataURI required");
    });

    it("reverts when paused", async () => {
      await registry.connect(owner).pause();
      await expect(
        registry.connect(alice).registerAgent(AGENT_TYPE, METADATA_URI)
      ).to.be.revertedWithCustomError(registry, "EnforcedPause");
    });

    it("refunds excess registration fee", async () => {
      await registry.connect(owner).setRegistrationFee(ethers.parseEther("0.01"));
      const balanceBefore = await ethers.provider.getBalance(alice.address);
      const tx = await registry.connect(alice).registerAgent(AGENT_TYPE, METADATA_URI, {
        value: ethers.parseEther("0.05"), // send 5x the fee
      });
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;
      const balanceAfter = await ethers.provider.getBalance(alice.address);
      // Should only have lost 0.01 ETH + gas
      const expectedLoss = ethers.parseEther("0.01") + gasUsed;
      expect(balanceBefore - balanceAfter).to.be.closeTo(expectedLoss, ethers.parseEther("0.001"));
    });

    it("reverts if insufficient fee sent", async () => {
      await registry.connect(owner).setRegistrationFee(ethers.parseEther("0.01"));
      await expect(
        registry.connect(alice).registerAgent(AGENT_TYPE, METADATA_URI, {
          value: ethers.parseEther("0.001"),
        })
      ).to.be.revertedWith("VaelRegistry: insufficient fee");
    });
  });

  // ── State management ───────────────────────────────────────────────────────

  describe("deactivateAgent / reactivateAgent", () => {
    let agentId: string;

    beforeEach(async () => {
      agentId = await registry.connect(alice).registerAgent.staticCall(AGENT_TYPE, METADATA_URI);
      await registry.connect(alice).registerAgent(AGENT_TYPE, METADATA_URI);
    });

    it("deactivates an active agent", async () => {
      await registry.connect(alice).deactivateAgent(agentId);
      const agent = await registry.getAgent(agentId);
      expect(agent.active).to.be.false;
    });

    it("emits AgentDeactivated", async () => {
      await expect(registry.connect(alice).deactivateAgent(agentId))
        .to.emit(registry, "AgentDeactivated")
        .withArgs(agentId, alice.address);
    });

    it("reverts deactivation by non-owner", async () => {
      await expect(registry.connect(bob).deactivateAgent(agentId))
        .to.be.revertedWith("VaelRegistry: not agent owner");
    });

    it("reverts double deactivation", async () => {
      await registry.connect(alice).deactivateAgent(agentId);
      await expect(registry.connect(alice).deactivateAgent(agentId))
        .to.be.revertedWith("VaelRegistry: already inactive");
    });

    it("reactivates an inactive agent", async () => {
      await registry.connect(alice).deactivateAgent(agentId);
      await registry.connect(alice).reactivateAgent(agentId);
      const agent = await registry.getAgent(agentId);
      expect(agent.active).to.be.true;
    });

    it("emits AgentReactivated", async () => {
      await registry.connect(alice).deactivateAgent(agentId);
      await expect(registry.connect(alice).reactivateAgent(agentId))
        .to.emit(registry, "AgentReactivated")
        .withArgs(agentId, alice.address);
    });
  });

  // ── Metadata update ────────────────────────────────────────────────────────

  describe("updateMetadata", () => {
    let agentId: string;
    const NEW_URI = "ipfs://QmNewMetadataHash";

    beforeEach(async () => {
      agentId = await registry.connect(alice).registerAgent.staticCall(AGENT_TYPE, METADATA_URI);
      await registry.connect(alice).registerAgent(AGENT_TYPE, METADATA_URI);
    });

    it("updates metadataURI", async () => {
      await registry.connect(alice).updateMetadata(agentId, NEW_URI);
      const agent = await registry.getAgent(agentId);
      expect(agent.metadataURI).to.equal(NEW_URI);
    });

    it("emits AgentMetadataUpdated", async () => {
      await expect(registry.connect(alice).updateMetadata(agentId, NEW_URI))
        .to.emit(registry, "AgentMetadataUpdated")
        .withArgs(agentId, NEW_URI);
    });

    it("reverts for non-owner", async () => {
      await expect(registry.connect(bob).updateMetadata(agentId, NEW_URI))
        .to.be.revertedWith("VaelRegistry: not agent owner");
    });
  });

  // ── Queries ────────────────────────────────────────────────────────────────

  describe("queries", () => {
    it("getAgentsByOwner returns all agents for a wallet", async () => {
      await registry.connect(alice).registerAgent("trading", METADATA_URI);
      await registry.connect(alice).registerAgent("oracle", METADATA_URI);
      await registry.connect(bob).registerAgent("npc", METADATA_URI);

      const aliceAgents = await registry.getAgentsByOwner(alice.address);
      const bobAgents   = await registry.getAgentsByOwner(bob.address);

      expect(aliceAgents.length).to.equal(2);
      expect(bobAgents.length).to.equal(1);
    });

    it("isRegistered returns true for a registered agent", async () => {
      const agentId = await registry.connect(alice).registerAgent.staticCall(AGENT_TYPE, METADATA_URI);
      await registry.connect(alice).registerAgent(AGENT_TYPE, METADATA_URI);
      expect(await registry.isRegistered(agentId)).to.be.true;
    });

    it("isRegistered returns false for unknown agent", async () => {
      expect(await registry.isRegistered(ethers.ZeroHash)).to.be.false;
    });

    it("getAgent reverts for unknown agent", async () => {
      await expect(registry.getAgent(ethers.ZeroHash))
        .to.be.revertedWith("VaelRegistry: agent not found");
    });
  });

  // ── Admin ──────────────────────────────────────────────────────────────────

  describe("admin", () => {
    it("owner can set registration fee", async () => {
      await registry.connect(owner).setRegistrationFee(ethers.parseEther("0.01"));
      expect(await registry.registrationFee()).to.equal(ethers.parseEther("0.01"));
    });

    it("non-owner cannot set fee", async () => {
      await expect(registry.connect(alice).setRegistrationFee(1n))
        .to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
    });

    it("owner can pause and unpause", async () => {
      await registry.connect(owner).pause();
      await registry.connect(owner).unpause();
    });
  });
});
