// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IExtraPool.sol";
import "./interfaces/IExtraReceiptToken.sol";

// BASE_USDC_ADDRESS = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
// EXTRA_BASE_POOL_ADDRESS = 0xBB505c54D71E9e599cB8435b4F0cEEc05fC71cbD;
// EXTRA_BASE_RECEIPT_CONTRACT_ADDRESS = 0xa23B5b8f7C7A9c86f39849Af12867ADdD1273E3c;

contract BaseExtraStrategy is Ownable {
    string public name;
    address public immutable amanaVault;
    IERC20 public immutable inputToken;
    IExtraPool public immutable extraPool;
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
        extraPool = IExtraPool(receiptToken.lendingPool());
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
        extraPool.depositAndStake(
            reserveId,
            amount,
            address(this),
            referralCode
        );
    }

    function withdraw(uint256 _amount) external onlyVault {
        extraPool.unStakeAndWithdraw(
            reserveId,
            _amount,
            msg.sender,
            false // receiveNativeETH
        );
    }

    function totalUnderlyingAssets() external view returns (uint256) {
        // TODO - change this?
        return receiptToken.balanceOf(address(this));
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
