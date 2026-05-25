import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import { ActivityLogged } from "../generated/VaelLedger/VaelLedger";
import { Activity, Agent, RegistryStats } from "../generated/schema";

export function handleActivityLogged(event: ActivityLogged): void {
  const agentId = event.params.agentId.toHexString();
  const entryId = event.params.entryId;
  const id = agentId + "-" + entryId.toString();

  let activity = new Activity(id);
  activity.agent = agentId;
  activity.entryId = entryId;
  activity.action = event.params.action;
  activity.payload = Bytes.empty();
  activity.timestamp = event.params.timestamp;
  activity.blockNumber = event.block.number;
  activity.conditionHash = Bytes.empty();
  activity.transactionHash = event.transaction.hash;
  activity.save();

  // Update agent cached fields
  let agent = Agent.load(agentId);
  if (agent) {
    agent.totalActivities = agent.totalActivities.plus(BigInt.fromI32(1));
    agent.lastActivityAt = event.params.timestamp;
    agent.save();
  }

  // Update global stats
  let stats = RegistryStats.load("global");
  if (stats) {
    stats.totalActivities = stats.totalActivities.plus(BigInt.fromI32(1));
    stats.lastUpdatedAt = event.block.timestamp;
    stats.save();
  }
}
