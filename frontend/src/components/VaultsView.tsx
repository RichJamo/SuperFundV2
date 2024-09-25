import React, { useState } from "react";
import { VaultData, VaultAPY, VaultTotalAssets, UserVaultBalance } from "../types/types";
import { Address } from "thirdweb";
import DepositModal from "./DepositModal";
import WithdrawModal from "./WithdrawModal";
import mixpanel from "mixpanel-browser";

interface VaultsViewProps {
  loading: boolean;
  vaults: VaultData[];
  vaultAPYs: VaultAPY[];
  userVaultBalances: UserVaultBalance[];
  vaultTotalAssets: VaultTotalAssets[];
  transactionAmount: string;
  setTransactionAmount: (value: string) => void;
  depositTransaction: (value: Address) => Promise<any>;
  withdrawTransaction: (value: Address) => Promise<any>;
  usdcBalance: string;
}

const VaultsView: React.FC<VaultsViewProps> = ({
  loading,
  vaults,
  vaultAPYs,
  userVaultBalances,
  vaultTotalAssets,
  transactionAmount,
  setTransactionAmount,
  depositTransaction,
  withdrawTransaction,
  usdcBalance,
}) => {
  const [isDepositModalOpen, setDepositModalOpen] = useState(false);
  const [isWithdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [selectedVault, setSelectedVault] = useState<VaultData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDepositClick = (vault: VaultData) => {
    setSelectedVault(vault);
    mixpanel.track("Deposit Button Clicked", {
      vault: vault.name,
    });

    setDepositModalOpen(true);
  };

  const handleWithdrawClick = (vault: VaultData) => {
    setSelectedVault(vault);
    mixpanel.track("Withdraw Button Clicked", {
      vault: vault.name,
    });
    setWithdrawModalOpen(true);
  };

  const handleDeposit = async () => {
    if (!selectedVault) return;

    setIsProcessing(true);

    try {
      await depositTransaction(selectedVault.id as Address);
    } catch (error) {
      console.error("Transaction failed:", error);
    } finally {
      setIsProcessing(false);
      setDepositModalOpen(false);
    }
  };

  const handleWithdraw = async () => {
    if (!selectedVault) return;

    setIsProcessing(true);

    try {
      await withdrawTransaction(selectedVault.id as Address);
    } catch (error) {
      console.error("Transaction failed:", error);
    } finally {
      setIsProcessing(false);
      setWithdrawModalOpen(false);
    }
  };

  return (
    <div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="overflow-x-auto mt-10">
          <table className="min-w-full bg-black text-zinc-100">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-300 tracking-wider">
                  Chain
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-300 tracking-wider">
                  Protocol
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-300 tracking-wider">
                  VaultData
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-300 tracking-wider">
                  Total Assets
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-300 tracking-wider">
                  7d APY
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-300 tracking-wider">
                  User Balance
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-300 tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-900">
              {vaults.map((vault) => (
                <tr key={vault.id}>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {vault.protocol.network}
                    </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {vault.protocol.name}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {vault.name}
                    </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    $ {Number(vaultTotalAssets.find((asset) => asset.vaultId === vault.id)?.totalAssets).toFixed(2)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {(Number(vaultAPYs.find((APY7d) => APY7d.vaultId === vault.id)?.APY7d)*100).toFixed(2)}%
                    </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    $ {Number(userVaultBalances.find((balance) => balance.vaultId === vault.id)?.balance).toFixed(2)}
                    </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      <button
                        className="px-4 py-2 bg-blue-600 text-white rounded"
                        onClick={() => handleDepositClick(vault)}
                      >
                        Deposit
                      </button>
                      <button
                        className="px-4 py-2 bg-blue-600 text-white rounded"
                        onClick={() => handleWithdrawClick(vault)}
                      >
                        Withdraw
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DepositModal
        isOpen={isDepositModalOpen}
        closeModal={() => setDepositModalOpen(false)}
        transactionAmount={transactionAmount}
        setTransactionAmount={setTransactionAmount}
        handleDeposit={handleDeposit}
        usdcBalance={usdcBalance}
        isProcessing={isProcessing}
      />
      <WithdrawModal
        isOpen={isWithdrawModalOpen}
        closeModal={() => setWithdrawModalOpen(false)}
        transactionAmount={transactionAmount}
        setTransactionAmount={setTransactionAmount}
        handleWithdraw={handleWithdraw}
        vaultBalance={selectedVault ? userVaultBalances.find((balance) => balance.vaultId === selectedVault.id)?.balance : "0"}
        vaultTokenSymbol={selectedVault ? selectedVault.inputToken.symbol : ""} //ToDo - get from strategy contract
        isProcessing={isProcessing}
      />
    </div>
  );
};

export default VaultsView;
