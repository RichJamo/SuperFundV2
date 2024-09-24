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

export async function calculateAaveAPY(poolAddress: Address, inputTokenAddress: Address) {
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

export async function calculateMoonwellAPY(receiptTokenAddress: Address) {
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
  const { value: shares, decimals } = await getBalance({
    contract,
    address: userAddress
  });
  const balance = await readContract({
    contract,
    method: "function convertToAssets(uint256) view returns (uint256)",
    params: [shares]
  });
  const formattedBalance = Number(balance) / 10 ** decimals;
  return formattedBalance.toString();
}

export const fetchTotalAssets = async (vaultAddress: Address) => {
  const contract = getContract({
    client,
    chain: base,
    address: vaultAddress
  });
  const balance = await readContract({
    contract,
    method: "function totalAssets() view returns (uint256)"
  });
  const formattedBalance = Number(balance) / 10 ** 6; // TODO fetch decimals dynamically
  return formattedBalance.toString();
}

export const updateAPYs = async (vaultData: VaultData[]): Promise<VaultData[]> => {
  const updatedVaults = await Promise.all(
    vaultData.map(async (vault) => {
      try {
        const contract = getContract({
          client,
          chain: base,
          address: vault.id,
        });
        const strategyAddress = await readContract({
          contract,
          method: "function strategyAddress() view returns (address)",
        });
        const strategyContract = getContract({
          client,
          chain: base,
          address: strategyAddress,
        });
        let APY7d = 0;
        if (vault.protocol.name === "Aave") {
          console.log("Calculating Aave 7d APY")
          const receiptTokenAddress = await readContract({
            contract: strategyContract,
            method: "function aaveReceiptToken() view returns (address)",
          });

          const receiptTokenContract = getContract({
            client,
            chain: base,
            address: receiptTokenAddress,
          });

          const poolAddress = await readContract({
            contract: receiptTokenContract,
            method: "function POOL() view returns (address)",
          });

          APY7d = await calculateAaveAPY(poolAddress as Address, vault.inputToken.address as Address);
          console.log("APY7d", APY7d);
        } else {
          // Generic logic for other vaults (e.g., Moonwell)
          const receiptTokenAddress = await readContract({
            contract: strategyContract,
            method: "function receiptToken() view returns (address)",
          });
          APY7d = await calculateMoonwellAPY(receiptTokenAddress as Address);
        }

        return {
          ...vault,
          APY7d,
        };
      } catch (error) {
        console.error(`Error fetching data for vault ${vault.id}:`, error);
        return { ...vault, totalAssets: "Error", APY7d: 0 };
      }
    })
  );

  return updatedVaults;
};

