const DepositModal: React.FC<{
  isOpen: boolean;
  closeModal: () => void;
  title: string;
  balance: string;
  transactionAmount: string;
  setTransactionAmount: (value: string) => void;
  handleTransaction: () => void;
}> = ({
  isOpen,
  closeModal,
  title,
  balance,
  transactionAmount,
  setTransactionAmount,
  handleTransaction,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-xl p-8 w-full max-w-lg shadow-lg">
        {/* Modal header */}
        <h2 className="text-2xl font-semibold mb-6 text-center">{title}</h2>

        {/* Balance info */}
        <p className="text-center text-gray-600 mb-4">
          Your USDC balance: <span className="font-bold">{balance}</span>
        </p>

        {/* Input for deposit/withdraw amount */}
        <input
          type="number"
          value={transactionAmount}
          onChange={(e) => setTransactionAmount(e.target.value)}
          className="w-full px-5 py-3 border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 mb-6"
          placeholder="Enter amount"
        />

        {/* Buttons */}
        <div className="flex justify-end space-x-4">
          <button
            onClick={closeModal}
            className="px-5 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleTransaction}
            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default DepositModal;
