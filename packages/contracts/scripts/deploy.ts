import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

/**
 * Vael deployment script
 * Deploy order: VaelRegistry → VaelLedger → VaelPassport
 * Then wire them together with authorisation calls.
 * VaelReputation deployed in Session 6.
 *
 * Run:
 *   pnpm contracts:deploy:testnet   (Somnia testnet)
 *   pnpm contracts:deploy           (Somnia mainnet)
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Vael Protocol — Deployment");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  Network  : ${network.name} (chainId: ${network.chainId})`);
  console.log(`  Deployer : ${deployer.address}`);
  console.log(`  Balance  : ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} STT`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // ── 1. VaelRegistry ────────────────────────────────────────────────────────
  console.log("\n[1/3] Deploying VaelRegistry...");
  const RegistryFactory = await ethers.getContractFactory("VaelRegistry");
  const registry = await RegistryFactory.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log(`  ✓ VaelRegistry   : ${registryAddress}`);

  // ── 2. VaelLedger ──────────────────────────────────────────────────────────
  console.log("\n[2/3] Deploying VaelLedger...");
  const LedgerFactory = await ethers.getContractFactory("VaelLedger");
  const ledger = await LedgerFactory.deploy(registryAddress);
  await ledger.waitForDeployment();
  const ledgerAddress = await ledger.getAddress();
  console.log(`  ✓ VaelLedger     : ${ledgerAddress}`);

  // ── 3. VaelPassport ────────────────────────────────────────────────────────
  console.log("\n[3/3] Deploying VaelPassport...");
  const PassportFactory = await ethers.getContractFactory("VaelPassport");
  const passport = await PassportFactory.deploy(registryAddress);
  await passport.waitForDeployment();
  const passportAddress = await passport.getAddress();
  console.log(`  ✓ VaelPassport   : ${passportAddress}`);

  // ── Wire contracts ─────────────────────────────────────────────────────────
  console.log("\n[+] Wiring contracts...");

  // Authorise Ledger as a trusted logger on Registry
  await registry.authorise(ledgerAddress, true);
  console.log("  ✓ Registry authorised Ledger");

  // Authorise Ledger as an activity syncer on Passport
  await passport.setActivitySyncer(ledgerAddress, true);
  console.log("  ✓ Passport authorised Ledger as activity syncer");

  // ── Write addresses to .env ────────────────────────────────────────────────
  console.log("\n[+] Writing addresses to .env...");
  writeAddresses({
    VAEL_REGISTRY_ADDRESS: registryAddress,
    VAEL_LEDGER_ADDRESS:   ledgerAddress,
    VAEL_PASSPORT_ADDRESS: passportAddress,
  });

  // Also write to a deployments JSON for subgraph config
  writeDeploymentsJson({
    network: network.name,
    chainId: network.chainId.toString(),
    registry: registryAddress,
    ledger:   ledgerAddress,
    passport: passportAddress,
    deployedAt: new Date().toISOString(),
  });

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Vael deployment complete ✓");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  Registry  : ${registryAddress}`);
  console.log(`  Ledger    : ${ledgerAddress}`);
  console.log(`  Passport  : ${passportAddress}`);
  console.log("\n  Next: update subgraph.yaml with contract addresses");
  console.log("  Then: pnpm --filter @vael/subgraph deploy:local");
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
    // Also update NEXT_PUBLIC_ mirror keys
    const pubKey = `NEXT_PUBLIC_${key}`;
    if (env.includes(`${pubKey}=`)) {
      env = env.replace(new RegExp(`${pubKey}=.*`), `${pubKey}=${value}`);
    }
  }
  fs.writeFileSync(envPath, env);
  console.log("  ✓ .env updated");
}

function writeDeploymentsJson(data: Record<string, string>) {
  const dir = path.resolve(__dirname, "../deployments");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${data.network || "unknown"}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  console.log(`  ✓ deployments/${data.network}.json written`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
