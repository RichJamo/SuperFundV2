// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IMoonwellVault.sol";
// BASE_USDC_ADDRESS = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
// MOONWELL_BASE_USDC_VAULT_ADDRESS = 0xc1256Ae5FF1cf2719D4937adb3bbCCab2E00A2Ca;

contract BaseMoonwellStrategy is Ownable {
    address public vault;

    IERC20 public inputToken;
    IMoonwellVault public moonwellVault;

    constructor(
        address _vault,
        address _inputTokenAddress,
        address _moonwellVaultAddress
    ) {
        vault = _vault;
        inputToken = IERC20(_inputTokenAddress); // could get this from vault
        moonwellVault = IMoonwellVault(_moonwellVaultAddress);
    }

    modifier onlyVault() {
        require(msg.sender == vault, "Only vault can call");
        _;
    }

    function invest(uint256 amount) external onlyVault {
        SafeERC20.safeTransferFrom(
            inputToken,
            msg.sender,
            address(this),
            amount
        );
        inputToken.approve(address(moonwellVault), amount);
        moonwellVault.deposit(amount, address(this));
    }

    function withdraw(uint256 _amount) external onlyVault {
        moonwellVault.withdraw(_amount, msg.sender, address(this));
    }

    function totalUnderlyingAssets() external view returns (uint256) {
        uint256 shares = moonwellVault.balanceOf(address(this));
        return moonwellVault.convertToAssets(shares);
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
