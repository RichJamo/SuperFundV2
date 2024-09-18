import { useState, useEffect } from "react";
import { fetchVaultData } from "../utils/api";
import { formatTotalAssets } from "../utils/utils";
import {
  executeDeposit,
  executeWithdrawal,
  fetchUserVaultBalance,
} from "../actions/actions";
import VaultsView from "../components/VaultsView";
import { FormattedVault, VaultData } from "../types/types";
import { VAULT_IDS } from "../constants/index";
import { Address } from "thirdweb";
import { useActiveAccount } from "thirdweb/react";
import { Account } from "thirdweb/wallets";
import { useReadContract } from "thirdweb/react";
import { getBalance } from "thirdweb/extensions/erc20";
import { getContract } from "thirdweb";
import { client } from "../utils/client";
import { arbitrum } from "thirdweb/chains";
import { ARBITRUM_USDC_CONTRACT_ADDRESS } from "../constants";
import { toast } from "react-toastify";
import mixpanel from "mixpanel-browser";

const VaultsContainer = () => {
  const [vaults, setVaults] = useState<FormattedVault[]>([]);
  const [transactionAmount, setTransactionAmount] = useState("1");
  const [loading, setLoading] = useState<boolean>(true);
  const [activeAccount, setActiveAccount] = useState<Account | null>(null);

  const EOAaccount = useActiveAccount();
  
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

  const contract = getContract({
    client,
    chain: arbitrum,
    address: ARBITRUM_USDC_CONTRACT_ADDRESS,
  });

  async function updateUserVaultBalances(formattedVaults: FormattedVault[]) {
    // Create a new array with updated vault balances
    const updatedVaults = await Promise.all(
      formattedVaults.map(async (vault) => {
        try {
          const balance = await fetchUserVaultBalance(
            activeAccount?.address as Address,
            vault.id as Address
          );
          return { ...vault, userBalance: balance }; // Return updated vault
        } catch (error) {
          console.error(`Error fetching balance for vault ${vault.id}:`, error);
          return { ...vault, userBalance: "Error" }; // Handle error
        }
      })
    );
  
    // Update the state with the new array
    setVaults(updatedVaults);
  }
  

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
      console.log("Transaction confirmed")
      toast.success("Transaction confirmed");
      refetch();
      updateUserVaultBalances(vaults);
    } catch (error) {
      mixpanel.track("Deposit Submitted", {
        vault: vaultId.toString(),
      });
      toast.error("Transaction failed", {
        position: "top-right",
        autoClose: 3000,  // Close automatically after 3 seconds
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
      refetch();
      updateUserVaultBalances(vaults);
    } catch (error) {
      mixpanel.track("Withdraw Failed", {
        vault: vaultId.toString(),
      });
      toast.error("Transaction failed", {
        position: "top-right",
        autoClose: 3000,  // Close automatically after 3 seconds
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
    contract,
    address: activeAccount?.address as Address,
  });
  
  const usdcBalance = isLoading
    ? "Loading..."
    : error
    ? "Error"
    : usdcBalanceResult?.displayValue || "N/A";

    useEffect(() => {
    async function init() {
      try {
        const data: VaultData[] = await fetchVaultData(VAULT_IDS);
  
        const formattedVaults: FormattedVault[] = data.map((vaultData) => {
          const { id, name, protocol, inputToken, outputToken, rates, totalValueLockedUSD } =
            vaultData;
  
          const lenderVariableRate = rates.find(
            (rate) => rate.type === "VARIABLE" && rate.id.startsWith("LENDER")
          );
          const borrowerVariableRate = rates.find(
            (rate) => rate.type === "VARIABLE" && rate.id.startsWith("BORROWER")
          );
  
          return {
            id,
            protocol: protocol.name,
            name: name || "Unnamed Vault",
            symbol: outputToken.symbol || "N/A",
            chain: protocol.network,
            totalAssets: totalValueLockedUSD
              ? formatTotalAssets(totalValueLockedUSD, inputToken.decimals)
              : "N/A",
            previewPPS: lenderVariableRate
              ? `${parseFloat(lenderVariableRate.rate).toFixed(2)}%`
              : "N/A",
            pricePerVaultShare: borrowerVariableRate
              ? `${parseFloat(borrowerVariableRate.rate).toFixed(2)}%`
              : "N/A",
            apy7d: lenderVariableRate
              ? `${parseFloat(lenderVariableRate.rate).toFixed(2)}%`
              : "N/A",
            userBalance: "N/A",
          };
        });
  
        setVaults(formattedVaults);
  
        // Fetch user balances after setting the vaults
        await updateUserVaultBalances(formattedVaults);
      } catch (error) {
        console.error("Error initializing data:", error);
      } finally {
        setLoading(false);
      }
    }
    if (activeAccount) {
      init();
    }
  }, [activeAccount]);
  

  const handleUserChange = (username: string) => {
  };

  return (
    <VaultsView
      loading={loading}
      vaults={vaults}
      transactionAmount={transactionAmount}
      setTransactionAmount={setTransactionAmount}
      depositTransaction={handleDepositTransaction}
      withdrawTransaction={handleWithdrawTransaction}
      usdcBalance={usdcBalance}
    />
  );
};

export default VaultsContainer;
