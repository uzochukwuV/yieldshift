import { ethers } from "hardhat";

async function main() {
  console.log("Deploying YieldShift Vault on Base...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH\n");

  // Base mainnet addresses
  const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // USDC on Base
  const AUSDC_BASE = "0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB"; // aUSDC on Base (Aave V3)

  // Deploy YieldShiftVault
  console.log("Deploying YieldShiftVault...");
  const YieldShiftVault = await ethers.getContractFactory("YieldShiftVault");
  const vault = await YieldShiftVault.deploy(
    USDC_BASE,
    "YieldShift USDC Vault",
    "ysUSDC",
    deployer.address // Fee recipient (you can change this)
  );

  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log("✅ YieldShiftVault deployed to:", vaultAddress);

  // Deploy AaveV3Strategy
  console.log("\nDeploying AaveV3Strategy...");
  const AaveV3Strategy = await ethers.getContractFactory("AaveV3Strategy");
  const strategy = await AaveV3Strategy.deploy(
    USDC_BASE,
    AUSDC_BASE,
    vaultAddress
  );

  await strategy.waitForDeployment();
  const strategyAddress = await strategy.getAddress();
  console.log("✅ AaveV3Strategy deployed to:", strategyAddress);

  // Add strategy to vault
  console.log("\nAdding strategy to vault...");
  const tx = await vault.addStrategy(strategyAddress);
  await tx.wait();
  console.log("✅ Strategy added to vault");

  // Get vault stats
  console.log("\n📊 Vault Statistics:");
  const stats = await vault.getVaultStats();
  console.log("Total Assets:", ethers.formatUnits(stats.totalAssets_, 6), "USDC");
  console.log("Total Shares:", ethers.formatEther(stats.totalShares_));
  console.log("Share Price:", ethers.formatEther(stats.sharePrice_));

  console.log("\n🎉 Deployment Complete!");
  console.log("\n📝 Contract Addresses:");
  console.log("Vault:", vaultAddress);
  console.log("Strategy:", strategyAddress);

  console.log("\n🔍 Verify contracts with:");
  console.log(`npx hardhat verify --network base ${vaultAddress} "${USDC_BASE}" "YieldShift USDC Vault" "ysUSDC" "${deployer.address}"`);
  console.log(`npx hardhat verify --network base ${strategyAddress} "${USDC_BASE}" "${AUSDC_BASE}" "${vaultAddress}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
