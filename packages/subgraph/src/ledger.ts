import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import { ActivityLogged } from "../generated/VaelLedger/VaelLedger";
import { VaelLedger } from "../generated/VaelLedger/VaelLedger";
import { Activity, Agent, RegistryStats } from "../generated/schema";

export function handleActivityLogged(event: ActivityLogged): void {
  const agentId  = event.params.agentId.toHexString();
  const entryId  = event.params.entryId;
  const id       = agentId + "-" + entryId.toString();

  // Fetch full entry data from the contract to get payload + conditionHash
  const contract   = VaelLedger.bind(event.address);
  const entryCall  = contract.try_getEntry(event.params.agentId, entryId);

  let activity       = new Activity(id);
  activity.agent     = agentId;
  activity.entryId   = entryId;
  activity.action    = event.params.action;
  activity.timestamp = event.params.timestamp;
  activity.blockNumber      = event.block.number;
  activity.transactionHash  = event.transaction.hash;

  if (!entryCall.reverted) {
    activity.payload       = entryCall.value.payload;
    activity.conditionHash = entryCall.value.conditionHash;
    activity.target        = entryCall.value.target;
  } else {
    activity.payload       = Bytes.empty();
    activity.conditionHash = Bytes.empty();
    activity.target        = Bytes.empty();
  }

  activity.save();

  // Update agent cached counters
  let agent = Agent.load(agentId);
  if (agent) {
    agent.totalActivities = agent.totalActivities.plus(BigInt.fromI32(1));
    agent.lastActivityAt  = event.params.timestamp;
    agent.save();
  }

  // Update global stats
  let stats = RegistryStats.load("global");
  if (stats) {
    stats.totalActivities = stats.totalActivities.plus(BigInt.fromI32(1));
    stats.lastUpdatedAt   = event.block.timestamp;
    stats.save();
  }
}
