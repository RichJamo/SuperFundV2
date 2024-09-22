import { Address, getContract, prepareContractCall, sendTransaction } from "thirdweb";
import { client } from "../utils/client";
import { base } from "thirdweb/chains";
import { BASE_USDC_CONTRACT_ADDRESS } from "../constants";
import { GENERIC_VAULT_ADDRESS } from "../constants";
import { Account } from "thirdweb/wallets";
import { getBalance } from "thirdweb/extensions/erc20";
import { sendBatchTransaction, readContract } from "thirdweb";
import { VaultData } from "../types/types";

export const executeDeposit = async (vaultId: Address, activeAccount: Account, transactionAmount: bigint) => {
  let contract = getContract({
    client,
    chain: base,
    address: BASE_USDC_CONTRACT_ADDRESS
  });
  const approveTx = prepareContractCall({
    contract,
    method: "function approve(address to, uint256 value)",
    params: [GENERIC_VAULT_ADDRESS, transactionAmount]
  });
  console.log("approveTx", approveTx);
  contract = getContract({
    client,
    chain: base,
    address: GENERIC_VAULT_ADDRESS
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
    address: GENERIC_VAULT_ADDRESS
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

// Assuming client, base, and BASE_USDC_CONTRACT_ADDRESS are defined elsewhere

export const fetchVaultDataRPC = async (vaultIds: string[]): Promise<VaultData[]> => {
  const vaultData: VaultData[] = [];

  for (const vaultId of vaultIds) {
    try {
      // Fetch the vault contract
      const contract = getContract({
        client,
        chain: base,
        address: vaultId, // This should be the vault address, not BASE_USDC_CONTRACT_ADDRESS
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

      const totalValueLockedUSD = await readContract({
        contract,
        method: "function totalAssets() view returns (uint256)",
      });

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
      const receiptTokenAddress = await readContract({
        contract: strategyContract,
        method: "function aaveReceiptToken() view returns (address)",
      });
      const receiptTokenContract = getContract({
        client,
        chain: base,
        address: receiptTokenAddress,
      });
      const outputTokenSymbol = await readContract({
        contract: receiptTokenContract,
        method: "function symbol() view returns (string)",
      });

      // Placeholder for protocol details and rates as these might need to be manually added
      const protocol = {
        name: "Aave",
        network: "Base",
      };

      // const rates: Rate[] = []; // Add actual rate data fetching here if needed
      // Push the fetched data into the result array
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
      });
    } catch (error) {
      console.error(`Error fetching data for vault ${vaultId}:`, error);
    }
  }

  return vaultData;
};
