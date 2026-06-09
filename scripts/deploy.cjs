const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with account:", deployer.address);
  console.log(
    "Account balance:",
    (await ethers.provider.getBalance(deployer.address)).toString()
  );

  // ─── Deploy GreenSBT ───────────────────────────────────────────────────────
  console.log("\nDeploying GreenSBT...");
  const SBT = await ethers.getContractFactory("GreenSBT");
  const sbt = await SBT.deploy();
  await sbt.waitForDeployment();
  const sbtAddress = await sbt.getAddress();
  console.log("GreenSBT deployed to:", sbtAddress);

  // ─── Deploy GreenRegistry ──────────────────────────────────────────────────
  console.log("\nDeploying GreenRegistry...");
  const Registry = await ethers.getContractFactory("GreenRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("GreenRegistry deployed to:", registryAddress);

  // ─── Deploy GreenGovernance ────────────────────────────────────────────────
  console.log("\nDeploying GreenGovernance...");
  const VOTING_DURATION = 5 * 60;    // 5 minutes for demo
  const TIMELOCK_DURATION = 1 * 60;  // 1 minute for demo
  const Governance = await ethers.getContractFactory("GreenGovernance");
  const governance = await Governance.deploy(
    registryAddress,
    VOTING_DURATION,
    TIMELOCK_DURATION
  );
  await governance.waitForDeployment();
  const governanceAddress = await governance.getAddress();
  console.log("GreenGovernance deployed to:", governanceAddress);

  // ─── Link contracts ────────────────────────────────────────────────────────
  console.log("\nLinking contracts...");
  await registry.setSBTContract(sbtAddress);
  console.log("GreenRegistry: SBT contract set");

  await sbt.setRegistryContract(registryAddress);
  console.log("GreenSBT: registry contract set");

  await registry.setGovernanceContract(governanceAddress);
  console.log("GreenRegistry: governance contract set");

  // ─── Authorize deployer as first operator and voter ───────────────────────
  console.log("\nSetting up initial operator...");
  await registry.addOperator(deployer.address);
  console.log("Operator authorized:", deployer.address);

  // ─── Summary ───────────────────────────────────────────────────────────────
  console.log("\n─────────────────────────────────────────────────");
  console.log("Deployment complete. Save these addresses:");
  console.log("GreenSBT:        ", sbtAddress);
  console.log("GreenRegistry:   ", registryAddress);
  console.log("GreenGovernance: ", governanceAddress);
  console.log("─────────────────────────────────────────────────");
  console.log("\nEtherscan links:");
  console.log(`GreenSBT:        https://sepolia.etherscan.io/address/${sbtAddress}`);
  console.log(`GreenRegistry:   https://sepolia.etherscan.io/address/${registryAddress}`);
  console.log(`GreenGovernance: https://sepolia.etherscan.io/address/${governanceAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
