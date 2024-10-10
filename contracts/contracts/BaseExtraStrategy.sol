// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/ILendingPool.sol";
import "./interfaces/IExtraReceiptToken.sol";
import "hardhat/console.sol";

// BASE_USDC_ADDRESS = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
// EXTRA_BASE_POOL_ADDRESS = 0xBB505c54D71E9e599cB8435b4F0cEEc05fC71cbD;
// EXTRA_BASE_RECEIPT_CONTRACT_ADDRESS = 0xa23B5b8f7C7A9c86f39849Af12867ADdD1273E3c;

contract BaseExtraStrategy is Ownable {
    string public name;
    address public immutable amanaVault;
    IERC20 public immutable inputToken;
    ILendingPool public immutable extraPool;
    IExtraReceiptToken public immutable receiptToken;
    uint256 reserveId = 24;

    constructor(
        string memory _name,
        address _amanaVault,
        address _inputTokenAddress,
        address _receiptTokenAddress
    ) Ownable(msg.sender) {
        require(_amanaVault != address(0), "Invalid amanaVault address");
        name = _name;
        amanaVault = _amanaVault;
        inputToken = IERC20(_inputTokenAddress);
        receiptToken = IExtraReceiptToken(_receiptTokenAddress);
        extraPool = ILendingPool(receiptToken.lendingPool());
    }

    modifier onlyVault() {
        require(msg.sender == amanaVault, "Only amanaVault can call");
        _;
    }

    function invest(uint256 amount) external onlyVault {
        SafeERC20.safeTransferFrom(
            inputToken,
            msg.sender,
            address(this),
            amount
        );
        bool success = inputToken.approve(address(extraPool), amount);
        require(success, "Approval failed");
        uint16 referralCode = 1234;
        uint256 eTokenAmaount = extraPool.depositAndStake(
            reserveId,
            amount,
            address(this),
            referralCode
        );
        require(eTokenAmaount > 0, "Invest failed");
    }

    // function withdraw(uint256 _amount) external onlyVault {
    //     uint256 exchangeRate = extraPool.exchangeRateOfReserve(reserveId);
    //     uint256 eTokenAmount = (_amount * 10 ** 18) / exchangeRate + 1;

    //     uint256 amountReceived = extraPool.unStakeAndWithdraw(
    //         reserveId,
    //         eTokenAmount,
    //         msg.sender,
    //         true // receiveNativeETH
    //     );

    //     // require(amountReceived >= _amount, "Withdraw failed");
    //     return amountReceived;
    // }

    function withdraw(uint256 _amount) external returns (uint256) {
        console.log("withdraw: %s", _amount);
        // Get the user's total balance in underlying tokens and eTokens
        (
            uint256 userUnderlyingBalance,
            uint256 userETokenBalance
        ) = getBalances();

        // Calculate the proportion (_amount / userUnderlyingBalance)
        require(userUnderlyingBalance > 0, "No underlying balance available");
        require(_amount <= userUnderlyingBalance, "Amount exceeds balance");

        uint256 proportion = (_amount * 1e18) / userUnderlyingBalance;

        // Calculate the number of eTokens to redeem
        uint256 eTokensToRedeem = (userETokenBalance * proportion) / 1e18 + 1;

        // Check if there's enough liquidity in the pool to fulfill the withdrawal request
        // uint256 availableLiquidity = getAvailableLiquidity();
        // require(
        //     eTokensToRedeem <= availableLiquidity,
        //     "Insufficient pool liquidity for withdrawal"
        // );

        // Call unStakeAndWithdraw with the calculated number of eTokens
        uint256 amountReceived = extraPool.unStakeAndWithdraw(
            reserveId,
            eTokensToRedeem,
            msg.sender,
            true // receiveNativeETH
        );
        console.log("amountReceived: %s", amountReceived);
        // require(amountReceived >= _amount, "Withdraw failed");
        return amountReceived;
    }

    function getBalances()
        internal
        view
        returns (uint256 underlyingBalance, uint256 eTokenBalance)
    {
        // Create an array with the reserveId to query the user's position
        uint256[] memory reserveIds = new uint256[](1);
        reserveIds[0] = reserveId;

        // Get the user's position status from the lending pool
        ILendingPool.PositionStatus[] memory positionStatuses = extraPool
            .getPositionStatus(reserveIds, address(this));

        // Extract the relevant data from the user's position
        ILendingPool.PositionStatus memory position = positionStatuses[0];
        underlyingBalance = position.liquidity; // User's balance in underlying tokens
        eTokenBalance = position.eTokenStaked + position.eTokenUnStaked; // Total eToken balance
    }

    function totalUnderlyingAssets() external view returns (uint256) {
        uint256[] memory reserveIds = new uint256[](1);
        reserveIds[0] = reserveId;
        ILendingPool.PositionStatus[] memory status = extraPool
            .getPositionStatus(reserveIds, address(this));
        return status[0].liquidity;
    }

    function emergencyWithdraw(address _token) external onlyOwner {
        uint256 balance = IERC20(_token).balanceOf(address(this));
        require(balance > 0, "No tokens to withdraw");
        SafeERC20.safeTransfer(IERC20(_token), owner(), balance);
    }

    function emergencyWithdrawETH() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH to withdraw");
        payable(owner()).transfer(balance);
    }

    receive() external payable {}
}
