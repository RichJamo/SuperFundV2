// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/ICompoundVault.sol";
// BASE_USDC_ADDRESS = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
// COMPOUND_BASE_USDC_VAULT_ADDRESS = 0xb125E6687d4313864e53df431d5425969c15Eb2F;

contract BaseCompoundStrategy is Ownable {
    string public name;
    address public amanaVault;
    IERC20 public inputToken;
    ICompoundVault public receiptToken;

    constructor(
        string memory _name,
        address _amanaVault,
        address _inputTokenAddress,
        address _receiptTokenAddress
    ) {
        name = _name;
        amanaVault = _amanaVault;
        inputToken = IERC20(_inputTokenAddress); // could get this from amanaVault
        receiptToken = ICompoundVault(_receiptTokenAddress);
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
        inputToken.approve(address(receiptToken), amount);
        receiptToken.supply(address(inputToken), amount);
    }

    function withdraw(uint256 _amount) external onlyVault {
        receiptToken.withdrawFrom(
            address(this),
            msg.sender,
            address(inputToken),
            _amount
        );
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
