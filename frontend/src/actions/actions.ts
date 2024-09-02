import { Address, getContract, prepareContractCall, sendTransaction } from "thirdweb";
import { client } from "../utils/client";
import { optimism } from "thirdweb/chains";
import { USDC_CONTRACT_ADDRESS} from "../constants";
import { Account, smartWallet } from "thirdweb/wallets";
import { getBalance } from "thirdweb/extensions/erc20";
import { sendBatchTransaction, readContract } from "thirdweb";

const connectClientSmartAccount = async (EOAaccount: Account, ClientSmartAccountAddress: Address) => {
  const wallet = smartWallet({
    chain: optimism,
    sponsorGas: true,
    overrides: {
      accountAddress: ClientSmartAccountAddress
    }
  });
  if (!EOAaccount) {
    throw new Error("No active EOAaccount found");
  }
  await wallet.connect({
    client: client,
    personalAccount: EOAaccount
  });
  let smartAccount = wallet.getAccount();
  if (!smartAccount) {
    throw new Error("No smart account found");
  }
  return smartAccount;
}

export const executeDeposit = async (vaultId: Address, EOAaccount: Account, transactionAmount: bigint, clientSmartAccountAddress: Address) => {
  let contract = getContract({
    client,
    chain: optimism,
    address: vaultId
  });
  const poolAddress = await readContract({
    contract: contract,
    method: 'function POOL() view returns (address pool)'
  });
  contract = getContract({
    client,
    chain: optimism,
    address: USDC_CONTRACT_ADDRESS
  });
  const approveTx = prepareContractCall({
    contract,
    method: "function approve(address to, uint256 value)",
    params: [poolAddress, transactionAmount]
  });
  contract = getContract({
    client,
    chain: optimism,
    address: poolAddress
  });
  const supplyTx = prepareContractCall({
    contract,
    method:
      "function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)",
    params: [USDC_CONTRACT_ADDRESS, transactionAmount, clientSmartAccountAddress, 0] // use a referral code?
  });
  const smartAccount = await connectClientSmartAccount(EOAaccount, clientSmartAccountAddress);
  if (!smartAccount) {
    throw new Error("No smart account found");
  }
  await sendBatchTransaction({
    account: smartAccount,
    transactions: [approveTx, supplyTx]
  });
  alert("Transaction confirmed");
};

export const executeWithdrawal = async (vaultId: Address, EOAaccount: Account, withdrawAmount: bigint, clientSmartAccountAddress: Address) => { //vaultId: string
  let contract = getContract({
    client,
    chain: optimism,
    address: vaultId
  });
  const poolAddress = await readContract({
    contract: contract,
    method: 'function POOL() view returns (address pool)'
  });
  contract = getContract({
    client,
    chain: optimism,
    address: poolAddress
  });
  const withdrawTx = prepareContractCall({
    contract,
    method:
      "function withdraw(address asset, uint256 amount, address to)",
    params: [USDC_CONTRACT_ADDRESS, BigInt(withdrawAmount), clientSmartAccountAddress]
  });
  
  let smartAccount = await connectClientSmartAccount(EOAaccount, clientSmartAccountAddress);
  if (!smartAccount) {
    throw new Error("No smart account found");
  }
  await sendTransaction({
    account: smartAccount,
    transaction: withdrawTx
  });
  alert("Transaction confirmed");
};

export const fetchUserVaultBalance = async (clientSmartAccountAddress: Address, vaultAddress: Address) => {
  const contract = getContract({
    client,
    chain: optimism,
    address: vaultAddress
  });
  const balance = await getBalance({
    contract,
    address: clientSmartAccountAddress
  });
  return balance?.displayValue;
}
