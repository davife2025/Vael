import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  AgentRegistered,
  AgentDeactivated,
  AgentReactivated,
  AgentMetadataUpdated,
} from "../generated/VaelRegistry/VaelRegistry";
import { Agent, RegistryStats } from "../generated/schema";

// ── Helpers ──────────────────────────────────────────────────────────────────

function getOrCreateStats(): RegistryStats {
  let stats = RegistryStats.load("global");
  if (!stats) {
    stats = new RegistryStats("global");
    stats.totalAgents     = BigInt.fromI32(0);
    stats.totalActivities = BigInt.fromI32(0);
    stats.totalPassports  = BigInt.fromI32(0);
    stats.lastUpdatedAt   = BigInt.fromI32(0);
  }
  return stats;
}

// ── Event Handlers ───────────────────────────────────────────────────────────

export function handleAgentRegistered(event: AgentRegistered): void {
  const agentId = event.params.agentId.toHexString();

  let agent = new Agent(agentId);
  agent.owner           = event.params.owner;
  agent.agentType       = event.params.agentType;
  agent.metadataURI     = "";
  agent.createdAt       = event.params.createdAt;
  agent.blockNumber     = event.block.number;
  agent.active          = true;
  agent.totalActivities = BigInt.fromI32(0);
  agent.lastActivityAt  = BigInt.fromI32(0);
  agent.save();

  let stats = getOrCreateStats();
  stats.totalAgents   = stats.totalAgents.plus(BigInt.fromI32(1));
  stats.lastUpdatedAt = event.block.timestamp;
  stats.save();
}

export function handleAgentDeactivated(event: AgentDeactivated): void {
  let agent = Agent.load(event.params.agentId.toHexString());
  if (!agent) return;
  agent.active = false;
  agent.save();
}

export function handleAgentReactivated(event: AgentReactivated): void {
  let agent = Agent.load(event.params.agentId.toHexString());
  if (!agent) return;
  agent.active = true;
  agent.save();
}

export function handleAgentMetadataUpdated(event: AgentMetadataUpdated): void {
  let agent = Agent.load(event.params.agentId.toHexString());
  if (!agent) return;
  agent.metadataURI = event.params.newMetadataURI;
  agent.save();
}
