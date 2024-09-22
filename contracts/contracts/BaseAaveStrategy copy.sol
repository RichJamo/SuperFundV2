// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IAavePool.sol";

contract AaveStrategy is Ownable {
    address public vault;
    address public constant BASE_USDC_CONTRACT_ADDRESS =
        0xaf88d065e77c8cC2239327C5EDb3A432268e5831;
    address public constant AAVE_POOL_ADDRESS =
        0x794a61358D6845594F94dc1DB02A252b5b4814aD;
    address public constant AAVE_ARBITRUM_USDCN_CONTRACT_ADDRESS =
        0x724dc807b04555b71ed48a6896b6F41593b8C637;

    IERC20 public inputToken;
    IAavePool public aavePool;
    IERC20 public aaveReceiptToken;

    constructor(
        address _vault,
        address _inputTokenAddress,
        address _aavePoolAddress,
        address _aaveReceiptTokenAddress
    ) {
        vault = _vault;
        inputToken = IERC20(_inputTokenAddress);
        aavePool = IAavePool(_aavePoolAddress);
        aaveReceiptToken = IERC20(_aaveReceiptTokenAddress);
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
        inputToken.approve(address(aavePool), amount);
        aavePool.supply(address(inputToken), amount, address(this), 0); // msg.sender or address(this)?
    }

    function withdraw(uint256 _amount) external onlyVault {
        aavePool.withdraw(address(inputToken), _amount, msg.sender);
    }

    function totalUnderlyingAssets() external view returns (uint256) {
        return aaveReceiptToken.balanceOf(address(this));
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
