import React, { useState } from "react";
import { Vault } from "../types/types";
import { Address } from "thirdweb";
import DepositModal from "./DepositModal";
import WithdrawModal from "./WithdrawModal";

interface VaultsViewProps {
  loading: boolean;
  vaults: Vault[];
  transactionAmount: string;
  setTransactionAmount: (value: string) => void;
  depositTransaction: (value: Address) => Promise<any>;
  withdrawTransaction: (value: Address) => Promise<any>;
  usdcBalance: string;
}

const VaultsView: React.FC<VaultsViewProps> = ({
  loading,
  vaults,
  transactionAmount,
  setTransactionAmount,
  depositTransaction,
  withdrawTransaction,
  usdcBalance,
}) => {
  const [isDepositModalOpen, setDepositModalOpen] = useState(false);
  const [isWithdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [selectedVault, setSelectedVault] = useState<Vault | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDepositClick = (vault: Vault) => {
    setSelectedVault(vault);
    setDepositModalOpen(true);
  };

  const handleWithdrawClick = (vault: Vault) => {
    setSelectedVault(vault);
    setWithdrawModalOpen(true);
  };

  const handleDeposit = async () => {
    if (!selectedVault) return;

    setIsProcessing(true);  // Start processing state

    try {
      await depositTransaction(selectedVault.id as Address);
    } catch (error) {
      console.error("Transaction failed:", error);
    } finally {
      setIsProcessing(false);  // Stop processing state
      setDepositModalOpen(false);  // Close the modal after transaction
    }
  };

  const handleWithdraw = async () => {
    if (!selectedVault) return;

    setIsProcessing(true);  // Start processing state

    try {
      await withdrawTransaction(selectedVault.id as Address);
    } catch (error) {
      console.error("Transaction failed:", error);
    } finally {
      setIsProcessing(false);  // Stop processing state
      setWithdrawModalOpen(false);  // Close the modal after transaction
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
                  Vault
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
                  <td className="px-4 py-4 whitespace-nowrap">{vault.chain}</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {vault.protocol}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">{vault.name}</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {vault.totalAssets}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">{vault.apy7d}</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                  {Number(vault.userBalance) > 0 ? `${Number(vault.userBalance).toFixed(2)} ${vault.symbol}` : "N/A"}
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

      {/* Modal Component */}
      <DepositModal
        isOpen={isDepositModalOpen}
        closeModal={() => setDepositModalOpen(false)}
        transactionAmount={transactionAmount}
        setTransactionAmount={setTransactionAmount}
        handleDeposit={handleDeposit}
        usdcBalance={usdcBalance}
        isProcessing={isProcessing}  // Pass processing state to modal
      />
      <WithdrawModal
        isOpen={isWithdrawModalOpen}
        closeModal={() => setWithdrawModalOpen(false)}
        transactionAmount={transactionAmount}
        setTransactionAmount={setTransactionAmount}
        handleWithdraw={handleWithdraw}
        vaultBalance={selectedVault ? selectedVault.userBalance : "0"}
        vaultTokenSymbol={selectedVault ? selectedVault.symbol : ""}
        isProcessing={isProcessing}  // Pass processing state to modal
      />
    </div>
  );
};

export default VaultsView;
