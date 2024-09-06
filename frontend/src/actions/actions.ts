import { Address, getContract, prepareContractCall, sendTransaction } from "thirdweb";
import { client } from "../utils/client";
import { arbitrum } from "thirdweb/chains";
import { ARBITRUM_USDC_CONTRACT_ADDRESS } from "../constants";
import { Account } from "thirdweb/wallets";
import { getBalance } from "thirdweb/extensions/erc20";
import { sendBatchTransaction, readContract } from "thirdweb";

export const executeDeposit = async (vaultId: Address, activeAccount: Account, transactionAmount: bigint) => {
  let contract = getContract({
    client,
    chain: arbitrum,
    address: vaultId
  });
  const poolAddress = await readContract({
    contract: contract,
    method: 'function POOL() view returns (address pool)'
  });
  contract = getContract({
    client,
    chain: arbitrum,
    address: ARBITRUM_USDC_CONTRACT_ADDRESS
  });
  const approveTx = prepareContractCall({
    contract,
    method: "function approve(address to, uint256 value)",
    params: [poolAddress, transactionAmount]
  });
  contract = getContract({
    client,
    chain: arbitrum,
    address: poolAddress
  });
  const supplyTx = prepareContractCall({
    contract,
    method:
      "function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)",
    params: [ARBITRUM_USDC_CONTRACT_ADDRESS, transactionAmount, activeAccount?.address, 0] // use a referral code?
  });
  await sendBatchTransaction({
    account: activeAccount,
    transactions: [approveTx, supplyTx]
  });
  alert("Transaction confirmed");
};

export const executeWithdrawal = async (vaultId: Address, activeAccount: Account, withdrawAmount: bigint) => { //vaultId: string
  let contract = getContract({
    client,
    chain: arbitrum,
    address: vaultId
  });
  const poolAddress = await readContract({
    contract: contract,
    method: 'function POOL() view returns (address pool)'
  });
  contract = getContract({
    client,
    chain: arbitrum,
    address: poolAddress
  });
  const withdrawTx = prepareContractCall({
    contract,
    method:
      "function withdraw(address asset, uint256 amount, address to)",
    params: [ARBITRUM_USDC_CONTRACT_ADDRESS, BigInt(withdrawAmount), activeAccount?.address]
  });
  await sendTransaction({
    account: activeAccount,
    transaction: withdrawTx
  });
  alert("Transaction confirmed");
};

export const fetchUserVaultBalance = async (userAddress: Address, vaultAddress: Address) => {
  console.log("got here")
  const contract = getContract({
    client,
    chain: arbitrum,
    address: vaultAddress
  });
  const balance = await getBalance({
    contract,
    address: userAddress
  });
  console.log("balance", balance?.displayValue);
  return balance?.displayValue;
}
