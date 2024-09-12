import React from "react";

const WithdrawModal: React.FC<{
  isOpen: boolean;
  closeModal: () => void;
  transactionAmount: string;
  setTransactionAmount: (value: string) => void;
  handleWithdraw: () => void;
  usdcBalance: string;
  isProcessing: boolean;  // Add isProcessing prop
}> = ({
  isOpen,
  closeModal,
  transactionAmount,
  setTransactionAmount,
  handleWithdraw,
  usdcBalance,
  isProcessing,  // Use isProcessing prop
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-xl p-8 w-full max-w-lg shadow-lg">
        {/* Modal header */}
        <h2 className="text-2xl font-semibold mb-6 text-center text-gray-700">Withdraw</h2>

        {/* Input for deposit/withdraw amount */}
        <div className="flex gap-4">
          <div className="flex flex-col flex-1">
            <p className="font-normal text-gray-500">From Wallet</p>
            <button className="bg-gray-400 rounded-lg p-2 text-left">USDC</button>
            <p className="text-sm text-black font-light mt-1">
              You have {Number(usdcBalance).toFixed(2)} USDC
            </p>
          </div>

          <div className="flex flex-col flex-1">
            <p className="font-normal text-gray-500">Amount</p>
            <div className="flex border border-gray-300 rounded-lg p-1">
              <input
                type="number"
                value={transactionAmount}
                onChange={(e) => setTransactionAmount(e.target.value)}
                className="w-full px-2 text-gray-800 focus:outline-none bg-transparent"
              />
              <button
                className="bg-gray-400 h-fit p-1 rounded-md text-black"
                onClick={() => setTransactionAmount(usdcBalance)}
              >
                Max
              </button>
            </div>
            <p className="text-sm text-black font-light mt-1">
              ${Number(transactionAmount).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end space-x-4 mt-8">
          <button
            onClick={() => {
              setTransactionAmount("1");
              closeModal();
            }}
            className="px-5 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium"
            disabled={isProcessing}  // Disable while processing
          >
            Cancel
          </button>
          <button
            onClick={handleWithdraw}
            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
            disabled={isProcessing}  // Disable while processing
          >
            {isProcessing ? (
              <div className="spinner-border animate-spin border-2 rounded-full w-4 h-4 border-white border-t-transparent"></div>
            ) : (
              "Confirm"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WithdrawModal;
