import React, { useState } from "react";
import { Vault } from "../types/types";
import { Address } from "thirdweb";
import DepositModal from "./DepositModal";

import { PayEmbed } from "thirdweb/react";
import { client } from "@/utils/client";

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
  usdcBalance
}) => {
  const [isModalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [selectedVault, setSelectedVault] = useState<Vault | null>(null);

  const handleDepositClick = (vault: Vault) => {
    setModalTitle("Deposit");
    setSelectedVault(vault);
    setModalOpen(true);
  };

  const handleWithdrawClick = (vault: Vault) => {
    setModalTitle("Withdraw");
    setSelectedVault(vault);
    setModalOpen(true);
  };

  const handleTransaction = async () => {
    if (selectedVault) {
      if (modalTitle === "Deposit") {
        await depositTransaction(selectedVault.id as Address);
      } else if (modalTitle === "Withdraw") {
        await withdrawTransaction(selectedVault.id as Address);
      }
      setModalOpen(false);
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
                    {vault.userBalance || "N/A"}
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
  isOpen={isModalOpen}
  closeModal={() => setModalOpen(false)}
  title={modalTitle}
  transactionAmount={transactionAmount}
  setTransactionAmount={setTransactionAmount}
  handleTransaction={() =>
    selectedVault
      ? depositTransaction(selectedVault.id as Address).then(() => setModalOpen(false))
      : null
  }
  usdcBalance={usdcBalance}
/>



    </div>
  );
};

export default VaultsView;
