import { Address, getContract, prepareContractCall, sendTransaction } from "thirdweb";
import { client } from "../utils/client";
import { arbitrum } from "thirdweb/chains";
import { ARBITRUM_USDC_CONTRACT_ADDRESS } from "../constants";
import { GENERIC_VAULT_ADDRESS } from "../constants";
import { Account } from "thirdweb/wallets";
import { getBalance } from "thirdweb/extensions/erc20";
import { sendBatchTransaction, readContract } from "thirdweb";

export const executeDeposit = async (vaultId: Address, activeAccount: Account, transactionAmount: bigint) => {
  let contract = getContract({
    client,
    chain: arbitrum,
    address: ARBITRUM_USDC_CONTRACT_ADDRESS
  });
  const approveTx = prepareContractCall({
    contract,
    method: "function approve(address to, uint256 value)",
    params: [GENERIC_VAULT_ADDRESS, transactionAmount]
  });
  console.log("approveTx", approveTx);
  contract = getContract({
    client,
    chain: arbitrum,
    address: GENERIC_VAULT_ADDRESS
  });
  const supplyTx = prepareContractCall({
    contract,
    method:
      "function deposit(uint256 assets,  address receiver)",
    params: [transactionAmount, activeAccount?.address]
  });
  console.log("supplyTx", supplyTx);
  await sendTransaction({
    account: activeAccount,
    transaction: supplyTx
  });
};

export const executeWithdrawal = async (vaultId: Address, activeAccount: Account, withdrawAmount: bigint) => { //vaultId: string
  let contract = getContract({
    client,
    chain: arbitrum,
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
    chain: arbitrum,
    address: vaultAddress
  });
  const balance = await getBalance({
    contract,
    address: userAddress
  });
  return balance?.displayValue;
}
