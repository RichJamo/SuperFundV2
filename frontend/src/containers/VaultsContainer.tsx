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
// import { updateUserVaultBalances } from "../actions/actions";

const VaultsContainer = () => {
  const [vaults, setVaults] = useState<FormattedVault[]>([]);
  const [transactionAmount, setTransactionAmount] = useState("");
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

  const handleDepositTransaction = async (vaultId: Address) => {
    try {
      setTransactionAmount;
      await executeDeposit(
        vaultId,
        EOAaccount,
        BigInt(transactionAmount),
      );
      // refetch();
      // updateUserVaultBalances();
    } catch (error) {
      throw new Error("Transaction failed");
    }
  };

  const handleWithdrawTransaction = async (vaultId: Address) => {
    try {
      setTransactionAmount;
      console.log("vaultId", vaultId);
      console.log("EOAaccount", EOAaccount);
      console.log("transactionAmount", BigInt(transactionAmount));
      await executeWithdrawal(
        vaultId,
        EOAaccount,
        BigInt(transactionAmount),
      );
      // refetch();
      // updateUserVaultBalances();
    } catch (error) {
      throw new Error("Transaction failed");
    }
  };

  useEffect(() => {
    async function init() {
      try {
        const data: VaultData[] = await fetchVaultData(VAULT_IDS);

        const formattedVaults: FormattedVault[] = data.map((vaultData) => {
          const { id, inputToken, name, rates, totalValueLockedUSD } =
            vaultData;

          const lenderVariableRate = rates.find(
            (rate) => rate.type === "VARIABLE" && rate.id.startsWith("LENDER")
          );
          const borrowerVariableRate = rates.find(
            (rate) => rate.type === "VARIABLE" && rate.id.startsWith("BORROWER")
          );

          return {
            id,
            name: name || "Unnamed Vault",
            symbol: inputToken.symbol || "N/A",
            chain: "Arbitrum",
            protocol: "Aave",
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

  useEffect(() => {
    // updateUserVaultBalances();
  }, [vaults]);

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
    />
  );
};

export default VaultsContainer;
