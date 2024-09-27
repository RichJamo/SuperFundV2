import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const network = hre.network.name;

  // Ensure we're deploying on the correct network (optional check)
  if (network !== "base") {
    throw new Error(
      '🚨 Please use the "base" network to deploy the contract.'
    );
  }

  // Fetch the deployer account
  const [signer] = await hre.ethers.getSigners();
  if (!signer) {
    throw new Error(
      `Wallet not found. Please, run "npx hardhat account --save" or set PRIVATE_KEY env variable (for example, in a .env file)`
    );
  }

  // Fetch the constructor parameters
  const governanceAddress = args.governance; // This should be passed as an argument
  if (!governanceAddress) {
    throw new Error("🚨 Governance address is required.");
  }

  // Deploy the Treasury contract
  const factory = await hre.ethers.getContractFactory("Treasury");
  const contract = await factory.deploy(governanceAddress);
  console.log("Contract deployed, waiting for confirmations...");

  await contract.deploymentTransaction().wait(5);

  console.log(`🔑 Using account: ${signer.address}`);
  console.log(`🚀 Successfully deployed Treasury on ${network}.`);
  console.log(`📜 Contract address: ${contract.target}`);

  // Verify the contract on Basescan or Etherscan
  if (network === "base" && hre.config.etherscan.apiKey.base) {
    console.log("🛠 Verifying contract on Basescan...");
    try {
      await hre.run("verify:verify", {
        address: contract.target,
        constructorArguments: [governanceAddress],
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

// Define the Hardhat task
task("deploy-treasury", "Deploy the Treasury contract", main)
  .addFlag("json", "Output in JSON")
  .addParam("governance", "The address of the governance");

export default {};
