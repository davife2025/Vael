import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

/**
 * Vael deployment script
 * Deploy order: VaelRegistry → VaelLedger → VaelPassport
 * VaelReputation deployed in Session 6
 *
 * Run: pnpm contracts:deploy (mainnet) | pnpm contracts:deploy:testnet
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying Vael contracts with:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "STT");

  // ── Session 2: contracts deployed here ──────────────────────────────────
  // const Registry = await ethers.getContractFactory("VaelRegistry");
  // const registry = await Registry.deploy();
  // await registry.waitForDeployment();
  // console.log("VaelRegistry deployed to:", await registry.getAddress());

  // const Ledger = await ethers.getContractFactory("VaelLedger");
  // const ledger = await Ledger.deploy(await registry.getAddress());
  // await ledger.waitForDeployment();

  // const Passport = await ethers.getContractFactory("VaelPassport");
  // const passport = await Passport.deploy(await registry.getAddress());
  // await passport.waitForDeployment();

  // ── Write addresses to .env for other packages ──────────────────────────
  // writeAddresses({ registry, ledger, passport });

  console.log("Deploy script ready — contracts will be written in Session 2");
}

function writeAddresses(contracts: Record<string, { address: string }>) {
  const envPath = path.resolve(__dirname, "../../../.env");
  let env = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  for (const [name, contract] of Object.entries(contracts)) {
    const key = `VAEL_${name.toUpperCase()}_ADDRESS`;
    const value = contract.address;
    env = env.includes(key)
      ? env.replace(new RegExp(`${key}=.*`), `${key}=${value}`)
      : env + `\n${key}=${value}`;
  }
  fs.writeFileSync(envPath, env);
  console.log("Contract addresses written to .env");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
