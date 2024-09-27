import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const network = hre.network.name;

  // Ensure we're deploying on base
  if (network !== "base") {
    throw new Error(
      '🚨 Please use the "base" network to deploy the contract.'
    );
  }

  const [signer] = await hre.ethers.getSigners();
  if (!signer) {
    throw new Error(
      `Wallet not found. Please, run "npx hardhat account --save" or set PRIVATE_KEY env variable (for example, in a .env file)`
    );
  }

  // Fetch the initializer parameters
  const name = args.name || "UpgradeableVault";
  const symbol = args.symbol || "UV";
  const assetaddress = args.assetaddress; // This should be passed as an argument
  const treasuryAddress = args.treasuryAddress; // Address for the treasury

  // Set the default for performanceFeeRate if it's not provided
  const performanceFeeRate = args.performanceFeeRate ?? 1500; // Default to 15% (1500 basis points)

  if (!assetaddress || !treasuryAddress) {
    throw new Error("🚨 Asset address and Treasury address are required.");
  }

  // Deploy the UpgradeableVault contract using OpenZeppelin Upgrades
  const factory = await hre.ethers.getContractFactory("UpgradeableVault");
  const contract = await hre.upgrades.deployProxy(factory, [name, symbol, assetaddress, treasuryAddress, performanceFeeRate], {
    initializer: "initialize",
  });
  console.log("Contract deployed, waiting for confirmations...");

  // Wait for 5 confirmations before proceeding
  await contract.deploymentTransaction().wait(5);


  console.log(`🔑 Using account: ${signer.address}`);
  console.log(`🚀 Successfully deployed UpgradeableVault on base.`);
  console.log(`📜 Contract address: ${contract.target}`);

  // Verify the contract on Basescan
  if (network === "base" && hre.config.etherscan.apiKey.base) {
    console.log("🛠 Verifying contract on Basescan...");
    try {
      await hre.run("verify:verify", {
        address: contract.target,
        constructorArguments: [], // No constructor arguments for upgradeable contracts
      });
      console.log(`✅ Contract verified: https://basescan.org/address/${contract.target}`);
    } catch (err) {
      console.error("❌ Contract verification failed:", err);
    }
  } else {
    console.log("🚨 Etherscan API key not configured or wrong network. Skipping verification.");
  }

  if (args.json) {
    console.log(JSON.stringify(contract));
  }
};

task("deploy-upgradeable-vault", "Deploy the UpgradeableVault contract", main)
  .addFlag("json", "Output in JSON")
  .addOptionalParam("name", "Token name", "UpgradeableVault")
  .addOptionalParam("symbol", "Token symbol", "UV")
  .addParam("assetaddress", "The address of the asset ERC20 token")
  .addParam("treasuryAddress", "The address of the treasury")
  .addOptionalParam("performanceFeeRate", "Performance fee rate (basis points)"); // Remove the default here

// Export the task so it can be used in hardhat
export default {};
