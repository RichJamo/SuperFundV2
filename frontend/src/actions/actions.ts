import { Address, getContract, prepareContractCall, sendTransaction } from "thirdweb";
import { client } from "../utils/client";
import { base } from "thirdweb/chains";
import { BASE_USDC_ADDRESS } from "../constants";
import { Account } from "thirdweb/wallets";
import { getBalance } from "thirdweb/extensions/erc20";
import { sendBatchTransaction, readContract } from "thirdweb";
import { VaultData } from "../types/types";
import { ethers, JsonRpcProvider } from "ethers";
import lendingPoolABI from "../../abis/lendingPoolABI.json";
import moonwellVaultABI from "../../abis/moonwellVaultABI.json";

import * as dotenv from "dotenv";
dotenv.config();
const provider = new JsonRpcProvider(process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL_BASE);

async function calculateAaveAPY(poolAddress: Address, inputTokenAddress: Address) {
  const aaveLendingPool = new ethers.Contract(poolAddress, lendingPoolABI, provider);

  const averageBlockTimeInSeconds = 2;
  const secondsInADay = 24 * 60 * 60;
  const secondsIn7Days = 7 * secondsInADay;

  const currentBlockNumber = await provider.getBlockNumber();
  const blocksIn7Days = Math.floor(secondsIn7Days / averageBlockTimeInSeconds);
  const pastBlockNumber = BigInt(currentBlockNumber - blocksIn7Days);

  const reserveData = await aaveLendingPool.getReserveData(inputTokenAddress);
  const currentLiquidityIndex = ethers.toBigInt(reserveData.liquidityIndex);

  const pastReserveData = await aaveLendingPool.getReserveData(inputTokenAddress, { blockTag: pastBlockNumber });
  const pastLiquidityIndex = ethers.toBigInt(pastReserveData.liquidityIndex);

  const rateOfChange = (currentLiquidityIndex - pastLiquidityIndex) * 10n ** 18n / pastLiquidityIndex;
  const normalizedRateOfChange = Number(rateOfChange) / Number(10n ** 18n);

  return Math.pow(1 + normalizedRateOfChange, 365 / 7) - 1;
}

async function calculateMoonwellAPY(receiptTokenAddress: Address, inputTokenAddress: Address) {
  const moonwellVault = new ethers.Contract(receiptTokenAddress, moonwellVaultABI, provider);

  const averageBlockTimeInSeconds = 2;
  const secondsInADay = 24 * 60 * 60;
  const secondsIn7Days = 7 * secondsInADay;

  const currentBlockNumber = await provider.getBlockNumber();
  const blocksIn7Days = Math.floor(secondsIn7Days / averageBlockTimeInSeconds);
  const pastBlockNumber = BigInt(currentBlockNumber - blocksIn7Days);

  const currentPrice = ethers.toBigInt(await moonwellVault.convertToAssets(BigInt(1e18)));

  const pastPrice = ethers.toBigInt(await moonwellVault.convertToAssets(BigInt(1e18), { blockTag: pastBlockNumber }));

  const rateOfChange = (currentPrice - pastPrice) * 10n ** 18n / pastPrice;
  const normalizedRateOfChange = Number(rateOfChange) / Number(10n ** 18n);

  return Math.pow(1 + normalizedRateOfChange, 365 / 7) - 1;
}

export const executeDeposit = async (vaultId: Address, activeAccount: Account, transactionAmount: bigint) => {
  let contract = getContract({
    client,
    chain: base,
    address: BASE_USDC_ADDRESS
  });
  const approveTx = prepareContractCall({
    contract,
    method: "function approve(address to, uint256 value)",
    params: [vaultId, transactionAmount]
  });
  console.log("approveTx", approveTx);
  contract = getContract({
    client,
    chain: base,
    address: vaultId
  });
  const supplyTx = prepareContractCall({
    contract,
    method:
      "function deposit(uint256 assets,  address receiver)",
    params: [transactionAmount, activeAccount?.address]
  });
  console.log("supplyTx", supplyTx);
  await sendBatchTransaction({
    account: activeAccount,
    transactions: [approveTx, supplyTx]
  });
};

export const executeWithdrawal = async (vaultId: Address, activeAccount: Account, withdrawAmount: bigint) => { //vaultId: string
  let contract = getContract({
    client,
    chain: base,
    address: vaultId
  });
  const withdrawTx = prepareContractCall({
    contract,
    method:
      "function withdraw(uint256 assets, address receiver, address owner)",
    params: [BigInt(withdrawAmount), activeAccount?.address, activeAccount?.address]
  });
  await sendTransaction({
    account: activeAccount,
    transaction: withdrawTx
  });
};

export const fetchUserVaultBalance = async (userAddress: Address, vaultAddress: Address) => {
  const contract = getContract({
    client,
    chain: base,
    address: vaultAddress
  });
  const balance = await getBalance({
    contract,
    address: userAddress
  });
  return balance?.displayValue;
}

export const fetchVaultDataRPC = async (vaultIds: string[]): Promise<VaultData[]> => {
  const vaultData: VaultData[] = [];

  for (const vaultId of vaultIds) {
    try {
      // Fetch the vault contract
      const contract = getContract({
        client,
        chain: base,
        address: vaultId,
      });

      // Fetch vault data
      const name = await readContract({
        contract,
        method: "function name() view returns (string)",
      });

      // const symbol = await readContract({
      //   contract,
      //   method: "function symbol() view returns (string)",
      // });

      const inputTokenAddress = await readContract({
        contract,
        method: "function asset() view returns (address)",
      });

      const strategyAddress = await readContract({
        contract,
        method: "function strategyAddress() view returns (address)",
      });
      console.log("strategyAddress", strategyAddress);
      const totalValueLockedUSD = await readContract({
        contract,
        method: "function totalAssets() view returns (uint256)",
      });
      console.log("totalValueLockedUSD", totalValueLockedUSD);
      // Fetch input token details
      const inputTokenContract = getContract({
        client,
        chain: base,
        address: inputTokenAddress,
      });

      const inputTokenSymbol = await readContract({
        contract: inputTokenContract,
        method: "function symbol() view returns (string)",
      });

      const inputTokenDecimals = await readContract({
        contract: inputTokenContract,
        method: "function decimals() view returns (uint8)",
      });

      // Fetch output token details (from strategy)
      const strategyContract = getContract({
        client,
        chain: base,
        address: strategyAddress,
      });
      let outputTokenSymbol = "";
      let APY7d = 0;
      let protocol = {
        name: "Unknown",
        network: "Unknown",
      };
      console.log("got here")
      if (vaultId === "0x4AD5E74EC722aAf52Bf4D1ACfE0A3EC516746A4d") {
        const receiptTokenAddress = await readContract({
          contract: strategyContract,
          method: "function aaveReceiptToken() view returns (address)",
        });

        console.log("receiptTokenAddress", receiptTokenAddress);

        const receiptTokenContract = getContract({
          client,
          chain: base,
          address: receiptTokenAddress,
        });

        outputTokenSymbol = await readContract({
          contract: receiptTokenContract,
          method: "function symbol() view returns (string)",
        });

        const poolAddress = await readContract({
          contract: receiptTokenContract,
          method: "function POOL() view returns (address)",
        });

        APY7d = await calculateAaveAPY(poolAddress as Address, inputTokenAddress as Address);

        // Placeholder for protocol details and rates as these might need to be manually added
        protocol = {
          name: "Aave",
          network: "Base",
        };
      } else {
        const receiptTokenAddress = await readContract({
          contract: strategyContract,
          method: "function receiptToken() view returns (address)",
        });

        console.log("receiptTokenAddress", receiptTokenAddress);

        const receiptTokenContract = getContract({
          client,
          chain: base,
          address: receiptTokenAddress,
        });

        outputTokenSymbol = await readContract({
          contract: receiptTokenContract,
          method: "function symbol() view returns (string)",
        });


        APY7d = await calculateMoonwellAPY(receiptTokenAddress as Address, inputTokenAddress as Address);

        // Placeholder for protocol details and rates as these might need to be manually added
        protocol = {
          name: "Moonwell",
          network: "Base",
        };
      }
      vaultData.push({
        id: vaultId,
        name,
        inputToken: {
          symbol: inputTokenSymbol,
          decimals: Number(inputTokenDecimals),
        },
        outputToken: {
          symbol: outputTokenSymbol,
        },
        protocol,
        totalValueLockedUSD: totalValueLockedUSD.toString(),
        APY7d
      });
    } catch (error) {
      console.error(`Error fetching data for vault ${vaultId}:`, error);
    }
  }

  return vaultData;
};
