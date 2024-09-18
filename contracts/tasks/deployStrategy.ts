import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();  // Load environment variables from .env

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const network = hre.network.name;

  // Ensure we're deploying on ArbitrumOne
  if (network !== "arbitrumOne") {
    throw new Error(
      '🚨 Please use the "arbitrumOne" network to deploy the contract.'
    );
  }

  const [signer] = await hre.ethers.getSigners();
  if (!signer) {
    throw new Error(
      `Wallet not found. Please, run "npx hardhat account --save" or set PRIVATE_KEY env variable (for example, in a .env file)`
    );
  }

  // Fetch the vault address argument required for the AaveStrategy constructor
  const vault = args.vault; // This should be passed as an argument
  if (!vault) {
    throw new Error("🚨 Vault address is required");
  }

  // Deploy the AaveStrategy contract
  const factory = await hre.ethers.getContractFactory("AaveStrategy");
  const contract = await factory.deploy(vault);
  await contract.deployed();

  console.log(`🔑 Using account: ${signer.address}`);
  console.log(`🚀 Successfully deployed AaveStrategy on ArbitrumOne.`);
  console.log(`📜 Contract address: ${contract.address}`);

  // Verify the contract on Arbiscan
  if (network === "arbitrumOne" && hre.config.etherscan.apiKey.arbitrumOne) {
    console.log("🛠 Verifying contract on Arbiscan...");
    try {
      await hre.run("verify:verify", {
        address: contract.address,
        constructorArguments: [vault],
      });
      console.log(`✅ Contract verified: https://arbiscan.io/address/${contract.address}`);
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

// Define the Hardhat task for deployment
task("deploy-strategy", "Deploy the AaveStrategy contract", main)
  .addFlag("json", "Output in JSON")
  .addParam("vault", "The address of the vault");

export default {};
