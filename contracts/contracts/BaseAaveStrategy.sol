// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IAavePool.sol";
import "./interfaces/IAaveReceiptToken.sol";

// BASE_USDC_ADDRESS = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
// AAVE_BASE_POOL_ADDRESS = 0xA238Dd80C259a72e81d7e4664a9801593F98d1c5;
// AAVE_BASE_USDC_CONTRACT_ADDRESS = 0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB;

contract BaseAaveStrategy is Ownable {
    string public name;
    address public amanaVault;
    IERC20 public inputToken;
    IAavePool public aavePool;
    IAaveReceiptToken public receiptToken;

    constructor(
        string memory _name,
        address _amanaVault,
        address _inputTokenAddress,
        address _receiptTokenAddress
    ) {
        name = _name;
        amanaVault = _amanaVault;
        inputToken = IERC20(_inputTokenAddress);
        receiptToken = IAaveReceiptToken(_receiptTokenAddress);
        aavePool = IAavePool(receiptToken.POOL());
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
        inputToken.approve(address(aavePool), amount);
        aavePool.supply(address(inputToken), amount, address(this), 0); // msg.sender or address(this)?
    }

    function withdraw(uint256 _amount) external onlyVault {
        aavePool.withdraw(address(inputToken), _amount, msg.sender);
    }

    function totalUnderlyingAssets() external view returns (uint256) {
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
