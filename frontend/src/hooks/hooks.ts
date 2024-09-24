import { useEffect } from "react";
import { fetchUserVaultBalance, fetchTotalAssets, calculateAaveAPY, calculateMoonwellAPY } from "../actions/actions";
import { Address } from "thirdweb";
import { VaultData } from "../types/types";
import { Account } from "thirdweb/wallets";
import { getContract, readContract } from "thirdweb";
import { client } from "../utils/client";
import { base } from "thirdweb/chains";

export const useUpdateUserVaultBalances = (
  vaults: VaultData[],
  activeAccount: Account,
  setUserVaultBalances: React.Dispatch<React.SetStateAction<any[]>>, // Accepts state setter
  setLoading: (loading: boolean) => void
) => {
  useEffect(() => {
    const updateUserVaultBalance = async () => {
      setLoading(true); // Set loading to true before the update begins
      try {
        const balances = await Promise.all(
          vaults.map(async (vault) => {
            try {
              const balance = await fetchUserVaultBalance(
                activeAccount?.address as Address,
                vault.id as Address
              );
              console.log(`Fetched balance for vault ${vault.id}:`, balance);
              return { vaultId: vault.id, balance };  // Return the balance associated with the vault ID
            } catch (error) {
              console.error(`Error fetching user balance for vault ${vault.id}:`, error);
              return { vaultId: vault.id, balance: "Error" };
            }
          })
        );

        // Update the state with the new balances array
        setUserVaultBalances(balances);
        console.log("Updated userVaultBalances", balances);
      } catch (error) {
        console.error("Error updating user vault balances:", error);
      } finally {
        setLoading(false); // Set loading to false once all updates are complete
      }
    };

    // Trigger the balance update when vaults or activeAccount change
    if (activeAccount && vaults.length > 0) {
      updateUserVaultBalance();
    }
  }, [vaults, activeAccount, setUserVaultBalances, setLoading]);  // Dependencies: trigger on vaults, activeAccount, setUserVaultBalances, and setLoading changes
};

export const useUpdateVaultTotalAssets = (
  vaults: VaultData[],
  setVaultTotalAssets: (vaultTotalAssets: { vaultId: string, totalAssets: string }[]) => void,
  activeAccount: Account | null,
  setLoading: (loading: boolean) => void
) => {
  useEffect(() => {
    const updateVaultTotalAssets = async () => {
      try {
        const updatedVaultTotalAssets = await Promise.all(
          vaults.map(async (vault) => {
            try {
              const newTotalAssets = await fetchTotalAssets(vault.id as Address);
              console.log(`Vault ${vault.id} - New total assets:`, newTotalAssets);
              return { vaultId: vault.id, totalAssets: newTotalAssets.toString() };
            } catch (error) {
              console.error(`Error fetching total assets for vault ${vault.id}:`, error);
              return { vaultId: vault.id, totalAssets: "Error" };
            }
          })
        );
        setVaultTotalAssets(updatedVaultTotalAssets);
      } finally {
        setLoading(false);  // Stop loading state after updating total assets
      }
    };

    // Trigger the function if there is an active account
    if (activeAccount) {
      setLoading(true);  // Set loading state before fetching
      updateVaultTotalAssets();
    }
  }, [vaults, activeAccount, setVaultTotalAssets, setLoading]);  // Dependencies: triggers when vaults or activeAccount change
};



export const useUpdateAPYs = (
  vaults: VaultData[],
  setVaultAPYs: (vaultAPYs: { vaultId: string, APY7d: number }[]) => void,
  setLoading: (loading: boolean) => void
) => {
  useEffect(() => {
    const updateAPYs = async () => {
      try {
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
              } else {
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
  }, [vaults, setVaultAPYs, setLoading]);  // Dependencies: will re-run when vaults, setVaultAPYs, or setLoading change
};