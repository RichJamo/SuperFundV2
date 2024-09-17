import "./tasks/interact";
import "./tasks/deploy";
import "./tasks/deployVault";
import "./tasks/deployStrategy";

import "@nomicfoundation/hardhat-toolbox";
import "@zetachain/toolkit/tasks";

import { getHardhatConfigNetworks } from "@zetachain/networks";
import { HardhatUserConfig } from "hardhat/config";
import * as dotenv from "dotenv";

dotenv.config();  // Load environment variables from .env

const config: HardhatUserConfig = {
  networks: {
    ...getHardhatConfigNetworks(),
    arbitrumOne: {
      url: "https://arb1.arbitrum.io/rpc",
      accounts: [process.env.PRIVATE_KEY],
    },
  },
  solidity: {
    compilers: [
      {
        version: "0.8.7",
      },
      {
        version: "0.8.20",
      }
    ]
  },
  etherscan: {
    apiKey: {
      arbitrumOne: process.env.ARBISCAN_API_KEY || "", // Add your Arbiscan API key here
    },
  },
};

export default config;
