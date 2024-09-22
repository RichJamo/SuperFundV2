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

  // Fetch the constructor parameters
  const name = args.name || "GenericVault";
  const symbol = args.symbol || "GV";
  const assetaddress = args.assetaddress; // This should be passed as an argument
  if (!assetaddress) {
    throw new Error("🚨 Asset address is required");
  }

  // Deploy the GenericVault contract
  const factory = await hre.ethers.getContractFactory("GenericVault");
  const contract = await factory.deploy(name, symbol, assetaddress);
  await contract.deployed();

  console.log(`🔑 Using account: ${signer.address}`);
  console.log(`🚀 Successfully deployed GenericVault on base.`);
  console.log(`📜 Contract address: ${contract.address}`);

  // Verify the contract on Basescan
  if (network === "base" && hre.config.etherscan.apiKey.base) {
    console.log("🛠 Verifying contract on Basescan...");
    try {
      await hre.run("verify:verify", {
        address: contract.address,
        constructorArguments: [name, symbol, assetaddress],
      });
      console.log(`✅ Contract verified: https://basescan.org/address/${contract.address}`);
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

task("deploy-vault", "Deploy the GenericVault contract", main)
  .addFlag("json", "Output in JSON")
  .addOptionalParam("name", "Token name", "GenericVault")
  .addOptionalParam("symbol", "Token symbol", "GV")
  .addParam("assetaddress", "The address of the asset ERC20 token");

// Export the task so it can be used in hardhat
export default {};
