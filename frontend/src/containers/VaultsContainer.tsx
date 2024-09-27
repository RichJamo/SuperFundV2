import { useState, useEffect } from "react";
import {
  executeDeposit,
  executeWithdrawal,
  } from "../actions/actions";
import VaultsView from "../components/VaultsView";
import { VaultData, VaultAPY, UserVaultBalance, VaultTotalAssets } from "../types/types";
import { VAULT_DATA, BASE_USDC_ADDRESS } from "../constants/index";
import { Address, getContract } from "thirdweb";
import { useActiveAccount } from "thirdweb/react";
import { Account } from "thirdweb/wallets";
import { useReadContract } from "thirdweb/react";
import { getBalance } from "thirdweb/extensions/erc20";
import { client } from "../utils/client";
import { base } from "thirdweb/chains";
import { toast } from "react-toastify";
import mixpanel from "mixpanel-browser";
import { useQueryClient } from "@tanstack/react-query";
import { useUpdateVaultBalanceAndTotal, useUpdateAPYs } from "@/hooks/hooks";

const VaultsContainer = () => {
  const [transactionAmount, setTransactionAmount] = useState("1");
  const [loading, setLoading] = useState<boolean>(true);
  const [activeAccount, setActiveAccount] = useState<Account | null>(null);
  const [vaultAPYs, setVaultAPYs] = useState<VaultAPY[]>([]);
  const [userVaultBalances, setUserVaultBalances] = useState<UserVaultBalance[]>([]);
  const [vaultTotalAssets, setVaultTotalAssets] = useState<VaultTotalAssets[]>([]);
  const [transactionCompleted, setTransactionCompleted] = useState(false);

  const vaults: VaultData[] = VAULT_DATA;
  const EOAaccount = useActiveAccount();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (EOAaccount) {
      setActiveAccount(EOAaccount);
    } else {
      setActiveAccount(null);
    }
  }, [EOAaccount]);

  if (!EOAaccount) {
    throw new Error("No active account found");
  }

  const usdcContract = getContract({
    client,
    chain: base,
    address: BASE_USDC_ADDRESS,
  });

  useUpdateVaultBalanceAndTotal(vaults, EOAaccount, setUserVaultBalances, setVaultTotalAssets, transactionCompleted);
  useUpdateAPYs(vaults, setVaultAPYs, setLoading);

  const handleDepositTransaction = async (vaultId: Address) => {
    try {
      setTransactionAmount;
      const value = Number(transactionAmount)
      const scaledAmount = BigInt(value * 10**6)
      mixpanel.track("Deposit Submitted", {
        vault: vaultId.toString(),
        amount: scaledAmount.toString(),
      });
      await executeDeposit(
        vaultId,
        EOAaccount,
        scaledAmount, //TODO make this general for all tokens?
      );
      mixpanel.track("Deposit Submitted", {
        vault: vaultId.toString(),
        amount: scaledAmount.toString(),
      });
      toast.success("Transaction confirmed");
      queryClient.invalidateQueries({ queryKey: ["walletBalance"] });
      refetch(); //refetches usdc balance of user
      setTimeout(() => {
        // Trigger the custom hook after a short delay
        setTransactionCompleted(!transactionCompleted);
      }, 1000);  // 1 second delay
    } catch (error) {
      mixpanel.track("Deposit Submitted", {
        vault: vaultId.toString(),
      });
      toast.error("Transaction failed", {
        position: "top-right",
        autoClose: 2000,  // Close automatically after 2 seconds
      });
      throw new Error("Transaction failed");
    }
  };

  const handleWithdrawTransaction = async (vaultId: Address) => {
    try {
      setTransactionAmount;
      const value = Number(transactionAmount)
      const scaledAmount = BigInt(value * 10**6)
      mixpanel.track("Withdraw Submitted", {
        vault: vaultId.toString(),
        amount: scaledAmount.toString(),
      });
      await executeWithdrawal(
        vaultId,
        EOAaccount,
        scaledAmount,
      );
      mixpanel.track("Withdraw Succeeded", {
        vault: vaultId.toString(),
        amount: scaledAmount.toString(),
      });
      toast.success("Transaction confirmed");
      queryClient.invalidateQueries({ queryKey: ["walletBalance"] });
      refetch();
      setTimeout(() => {
        // Trigger the custom hook after a short delay
        setTransactionCompleted(!transactionCompleted);
      }, 1000);  // 1 second delay
    } catch (error) {
      mixpanel.track("Withdraw Failed", {
        vault: vaultId.toString(),
      });
      toast.error("Transaction failed", {
        position: "top-right",
        autoClose: 2000,  // Close automatically after 2 seconds
      });
      throw new Error("Transaction failed");
    }
  };

  const {
    data: usdcBalanceResult,
    isLoading,
    error,
    refetch,
  } = useReadContract(getBalance, {
    contract: usdcContract,
    address: activeAccount?.address as Address,
  });
  
  const usdcBalance = isLoading
    ? "Loading..."
    : error
    ? "Error"
    : usdcBalanceResult?.displayValue || "N/A";
    
  const handleUserChange = (username: string) => {
  };

  return (
    <VaultsView
      loading={loading}
      vaults={vaults}
      vaultAPYs={vaultAPYs}
      userVaultBalances={userVaultBalances}
      vaultTotalAssets={vaultTotalAssets}
      transactionAmount={transactionAmount}
      setTransactionAmount={setTransactionAmount}
      depositTransaction={handleDepositTransaction}
      withdrawTransaction={handleWithdrawTransaction}
      usdcBalance={usdcBalance}
    />
  );
};

export default VaultsContainer;
