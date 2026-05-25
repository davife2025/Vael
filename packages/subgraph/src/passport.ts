import { BigInt } from "@graphprotocol/graph-ts";
import {
  PassportIssued,
  ReputationUpdated,
  PassportVerified,
} from "../generated/VaelPassport/VaelPassport";
import { Passport, Agent, RegistryStats } from "../generated/schema";

export function handlePassportIssued(event: PassportIssued): void {
  const agentId = event.params.agentId.toHexString();

  let passport            = new Passport(agentId);
  passport.agent          = agentId;
  passport.tokenId        = event.params.tokenId;
  passport.reputationScore = BigInt.fromI32(0);
  passport.totalActions   = BigInt.fromI32(0);
  passport.issuedAt       = event.block.timestamp;
  passport.lastActivityAt = BigInt.fromI32(0);
  passport.verified       = false;
  passport.save();

  // Link passport back to agent
  let agent = Agent.load(agentId);
  if (agent) {
    agent.save();
  }

  let stats = RegistryStats.load("global");
  if (stats) {
    stats.totalPassports = stats.totalPassports.plus(BigInt.fromI32(1));
    stats.lastUpdatedAt  = event.block.timestamp;
    stats.save();
  }
}

export function handleReputationUpdated(event: ReputationUpdated): void {
  const agentId = event.params.agentId.toHexString();
  let passport  = Passport.load(agentId);
  if (!passport) return;
  passport.reputationScore = event.params.newScore;
  passport.save();
}

export function handlePassportVerified(event: PassportVerified): void {
  const agentId = event.params.agentId.toHexString();
  let passport  = Passport.load(agentId);
  if (!passport) return;
  passport.verified = true;
  passport.save();
}
