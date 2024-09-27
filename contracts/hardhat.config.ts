import "./tasks/interact";
import "./tasks/deploy";
import "./tasks/deployVault";
import "./tasks/deployStrategy";

import "@nomicfoundation/hardhat-toolbox";
import "@zetachain/toolkit/tasks";
import "@typechain/hardhat";

import { getHardhatConfigNetworks } from "@zetachain/networks";
import { HardhatUserConfig } from "hardhat/config";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  networks: {
    ...getHardhatConfigNetworks(),
    arbitrumOne: {
      url: "https://arb1.arbitrum.io/rpc",
      accounts: [process.env.PRIVATE_KEY],
    },
    base: {
      url: `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: [process.env.PRIVATE_KEY],
    },
    hardhat: {
      forking: {
        url: `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
        blockNumber: 20113140, // Optional: Set a block number to fork from
      },
    },
  },
  solidity: {
    compilers: [
      {
        version: "0.8.7",
      },
      {
        version: "0.8.26",
      }
    ]
  },
  etherscan: {
    apiKey: {
      arbitrumOne: process.env.ARBISCAN_API_KEY || "", // Add your Arbiscan API key here
      base: process.env.BASESCAN_API_KEY || "", // Add your Etherscan API key here
    },
    customChains: [
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org"
        }
      }
    ],
  },
  typechain: {
    outDir: "typechain",  // This is where Typechain outputs the generated types
    target: "ethers-v5",  // Target ethers.js
  },
};

export default config;
