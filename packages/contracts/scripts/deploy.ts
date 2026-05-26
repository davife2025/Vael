import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  const network    = await ethers.provider.getNetwork();

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Vael Protocol — Full Deployment");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  Network  : ${network.name} (chainId: ${network.chainId})`);
  console.log(`  Deployer : ${deployer.address}`);
  console.log(`  Balance  : ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} STT`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // ── 1. VaelRegistry ──────────────────────────────────────────────────────
  console.log("\n[1/4] Deploying VaelRegistry...");
  const Registry  = await ethers.getContractFactory("VaelRegistry");
  const registry  = await Registry.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log(`  ✓ VaelRegistry    : ${registryAddress}`);

  // ── 2. VaelLedger ────────────────────────────────────────────────────────
  console.log("\n[2/4] Deploying VaelLedger...");
  const Ledger  = await ethers.getContractFactory("VaelLedger");
  const ledger  = await Ledger.deploy(registryAddress);
  await ledger.waitForDeployment();
  const ledgerAddress = await ledger.getAddress();
  console.log(`  ✓ VaelLedger      : ${ledgerAddress}`);

  // ── 3. VaelPassport ──────────────────────────────────────────────────────
  console.log("\n[3/4] Deploying VaelPassport...");
  const Passport  = await ethers.getContractFactory("VaelPassport");
  const passport  = await Passport.deploy(registryAddress);
  await passport.waitForDeployment();
  const passportAddress = await passport.getAddress();
  console.log(`  ✓ VaelPassport    : ${passportAddress}`);

  // ── 4. VaelReputation ────────────────────────────────────────────────────
  console.log("\n[4/4] Deploying VaelReputation...");
  const Reputation  = await ethers.getContractFactory("VaelReputation");
  const reputation  = await Reputation.deploy(registryAddress, ledgerAddress, passportAddress);
  await reputation.waitForDeployment();
  const reputationAddress = await reputation.getAddress();
  console.log(`  ✓ VaelReputation  : ${reputationAddress}`);

  // ── Wire contracts ────────────────────────────────────────────────────────
  console.log("\n[+] Wiring contracts...");

  await registry.authorise(ledgerAddress, true);
  console.log("  ✓ Registry authorised Ledger");

  await passport.setActivitySyncer(ledgerAddress, true);
  console.log("  ✓ Passport authorised Ledger as activity syncer");

  await passport.setReputationOracle(reputationAddress, true);
  console.log("  ✓ Passport authorised Reputation as oracle");

  // ── Write addresses ───────────────────────────────────────────────────────
  console.log("\n[+] Writing addresses...");
  writeAddresses({
    VAEL_REGISTRY_ADDRESS:   registryAddress,
    VAEL_LEDGER_ADDRESS:     ledgerAddress,
    VAEL_PASSPORT_ADDRESS:   passportAddress,
    VAEL_REPUTATION_ADDRESS: reputationAddress,
  });
  writeDeploymentsJson({
    network:    network.name,
    chainId:    network.chainId.toString(),
    registry:   registryAddress,
    ledger:     ledgerAddress,
    passport:   passportAddress,
    reputation: reputationAddress,
    deployedAt: new Date().toISOString(),
  });

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Vael deployment complete ✓");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  Registry   : ${registryAddress}`);
  console.log(`  Ledger     : ${ledgerAddress}`);
  console.log(`  Passport   : ${passportAddress}`);
  console.log(`  Reputation : ${reputationAddress}`);
  console.log("\n  Next steps:");
  console.log("  1. Update subgraph.yaml with contract addresses");
  console.log("  2. pnpm --filter @vael/subgraph deploy:local");
  console.log("  3. pnpm api:dev");
  console.log("  4. pnpm web:dev");
}

function writeAddresses(addresses: Record<string, string>) {
  const envPath = path.resolve(__dirname, "../../../.env");
  let env = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  for (const [key, value] of Object.entries(addresses)) {
    if (env.includes(`${key}=`)) {
      env = env.replace(new RegExp(`${key}=.*`), `${key}=${value}`);
    } else {
      env += `\n${key}=${value}`;
    }
    const pubKey = `NEXT_PUBLIC_${key}`;
    if (env.includes(`${pubKey}=`)) {
      env = env.replace(new RegExp(`${pubKey}=.*`), `${pubKey}=${value}`);
    }
  }
  fs.writeFileSync(envPath, env);
  console.log("  ✓ .env updated");
}

function writeDeploymentsJson(data: Record<string, string>) {
  const dir  = path.resolve(__dirname, "../deployments");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${data.network || "unknown"}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  console.log(`  ✓ deployments/${data.network}.json written`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
