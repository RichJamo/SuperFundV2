import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import * as dotenv from "dotenv";

dotenv.config();  // Load environment variables from .env

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

  // Fetch the vault address argument required for the BaseAaveStrategy constructor
  const vault = args.vault; // This should be passed as an argument
  const inputToken = args.inputToken;
  const poolAddress = args.poolAddress;
  const receiptToken = args.receiptToken;
  if (!vault) {
    throw new Error("🚨 Vault address is required");
  }
  if (!inputToken) {
    throw new Error("🚨 Input token address is required");
  }
  if (!poolAddress) {
    throw new Error("🚨 Aave pool address is required");
  }
  if (!receiptToken) {
    throw new Error("🚨 Receipt token address is required");
  }

  // Deploy the BaseAaveStrategy contract
  const factory = await hre.ethers.getContractFactory("BaseAaveStrategy");
  const contract = await factory.deploy(vault, inputToken, poolAddress, receiptToken);
  await contract.deployed();

  console.log(`🔑 Using account: ${signer.address}`);
  console.log(`🚀 Successfully deployed BaseAaveStrategy on base.`);
  console.log(`📜 Contract address: ${contract.address}`);

  // Verify the contract on Basescan
  if (network === "base" && hre.config.etherscan.apiKey.base) {
    console.log("🛠 Verifying contract on Basescan...");
    try {
      await hre.run("verify:verify", {
        address: contract.address,
        constructorArguments: [vault, inputToken, poolAddress, receiptToken],
      });
      console.log(`✅ Contract verified: https://basescan.io/address/${contract.address}`);
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
task("deploy-strategy", "Deploy the BaseAaveStrategy contract", main)
  .addFlag("json", "Output in JSON")
  .addParam("vault", "The address of the vault")
  .addParam("inputToken", "The address of the input token")
  .addParam("poolAddress", "The address of the Aave pool")
  .addParam("receiptToken", "The address of the receipt token")

export default {};
