import { useEffect } from "react";
import { fetchUserVaultBalance, fetchTotalAssets, calculateAaveAPY, calculateMoonwellAPY, calculateCompoundAPY } from "../actions/actions";
import { Address } from "thirdweb";
import { VaultData } from "../types/types";
import { Account } from "thirdweb/wallets";
import { getContract, readContract } from "thirdweb";
import { client } from "../utils/client";
import { base } from "thirdweb/chains";

export const useUpdateVaultBalanceAndTotal = (
  vaults: VaultData[],
  activeAccount: Account,
  setUserVaultBalances: React.Dispatch<React.SetStateAction<any[]>>, // Accepts state setter
  setVaultTotalAssets: React.Dispatch<React.SetStateAction<any[]>>, // Accepts state setter
  transactionCompleted: boolean,
) => {
  useEffect(() => {
    const updateVaultBalanceAndTotal = async () => {
      try {
        const balancesAndAssets = await Promise.all(
          vaults.map(async (vault) => {
            try {
              const balance = await fetchUserVaultBalance(
                activeAccount?.address as Address,
                vault.id as Address
              );
              console.log(`Fetched balance for vault ${vault.id}:`, balance);
              const newTotalAssets = await fetchTotalAssets(vault.id as Address);
              console.log(`Vault ${vault.id} - New total assets:`, newTotalAssets);
              return {
                vaultId: vault.id,
                balance,
                totalAssets: newTotalAssets.toString(),
              };
            } catch (error) {
              console.error(`Error fetching user balance or total assets for vault ${vault.id}:`, error);
              return {
                vaultId: vault.id,
                balance: "Error",
                totalAssets: "Error",
              };
            }
          })
        );

        const balances = balancesAndAssets.map(({ vaultId, balance }) => ({
          vaultId,
          balance,
        }));

        const totalAssets = balancesAndAssets.map(({ vaultId, totalAssets }) => ({
          vaultId,
          totalAssets,
        }));

        setUserVaultBalances(balances); // Update user balances
        setVaultTotalAssets(totalAssets); // Update total assets
        console.log("Updated userVaultBalances and vaultTotalAssets", balancesAndAssets);
      } catch (error) {
        console.error("Error updating vault balances and total assets:", error);
      }
    };

    if (activeAccount && vaults.length > 0) {
      updateVaultBalanceAndTotal();
    }
  }, [vaults, activeAccount, setUserVaultBalances, setVaultTotalAssets, transactionCompleted]);
};


export const useUpdateAPYs = (
  vaults: VaultData[],
  setVaultAPYs: (vaultAPYs: { vaultId: string, APY7d: number }[]) => void,
  setLoading: (loading: boolean) => void
) => {
  useEffect(() => {
    const updateAPYs = async () => {
      try {
        console.log("Updating APYs");
        const updatedVaultAPYs = await Promise.all(
          vaults.map(async (vault) => {
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
              } else if (vault.protocol.name === "Compound") {
                const receiptTokenAddress = await readContract({
                  contract: strategyContract,
                  method: "function receiptToken() view returns (address)",
                });

                APY7d = await calculateCompoundAPY(receiptTokenAddress as Address);
              }
              else {
                const receiptTokenAddress = await readContract({
                  contract: strategyContract,
                  method: "function receiptToken() view returns (address)",
                });

                APY7d = await calculateMoonwellAPY(receiptTokenAddress as Address);
              }

              return { vaultId: vault.id, APY7d };
            } catch (error) {
              console.error(`Error fetching APY for vault ${vault.id}:`, error);
              return { vaultId: vault.id, APY7d: 0 };
            }
          })
        );

        setVaultAPYs(updatedVaultAPYs);
      } finally {
        setLoading(false);  // Stop the loading state after updating APYs
      }
    };

    // Trigger the function if vaults are available
    if (vaults.length > 0) {
      setLoading(true);  // Set loading state before fetching APYs
      updateAPYs();
    }
  }, []);
};