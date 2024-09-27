import { getAddress, ParamChainName } from "@zetachain/protocol-contracts";
import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const network = hre.network.name as ParamChainName;

  if (!/zeta_(testnet|mainnet)/.test(network)) {
    throw new Error(
      '🚨 Please use either "zeta_testnet" or "zeta_mainnet" network to deploy to ZetaChain.'
    );
  }

  const [signer] = await hre.ethers.getSigners();
  if (signer === undefined) {
    throw new Error(
      `Wallet not found. Please, run "npx hardhat account --save" or set PRIVATE_KEY env variable (for example, in a .env file)`
    );
  }
  const systemContract = getAddress("systemContract", network);
  if (!systemContract) {
    throw new Error(`System contract address not found for ${network}`);
  }

  // Fetch the constructor parameters
  const name = args.name || "Default Name";
  const symbol = args.symbol || "SYM";
  const assetaddress = args.assetaddress; // This should be passed as an argument
  if (!assetaddress) {
    throw new Error("Asset address is required");
  }

  // Deploy the contract with all the necessary constructor parameters
  const factory = await hre.ethers.getContractFactory("ZRC4626");
  const contract = await factory.deploy(name, symbol, assetaddress, systemContract);
  console.log("Contract deployed, waiting for confirmations...");

  // Wait for 5 confirmations before proceeding
  await contract.deploymentTransaction().wait(5);

  const isTestnet = network === "zeta_testnet";
  const zetascan = isTestnet ? "athens.explorer" : "explorer";
  const blockscout = isTestnet ? "zetachain-athens-3" : "zetachain";

  if (args.json) {
    console.log(JSON.stringify(contract));
  } else {
    console.log(`🔑 Using account: ${signer.address}

🚀 Successfully deployed contract on ${network}.
📜 Contract address: ${contract.target}
🌍 ZetaScan: https://${zetascan}.zetachain.com/address/${contract.target}
🌍 Blockcsout: https://${blockscout}.blockscout.com/address/${contract.target}
`);
  }
};

task("deploy", "Deploy the contract", main)
  .addFlag("json", "Output in JSON")
  .addOptionalParam("contractname", "Contract to deploy", "Greeting")
  .addOptionalParam("name", "Token name", "RichToken")
  .addOptionalParam("symbol", "Token symbol", "RTR")
  .addParam("assetaddress", "The address of the asset ERC20 token");
