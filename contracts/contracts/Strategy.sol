// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IAavePool {
    function supply(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode
    ) external;
    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external returns (uint256);
    function getReserveNormalizedIncome(
        address asset
    ) external view returns (uint256);
}

contract Strategy is Ownable {
    address public vault;
    // address public governance;
    address public constant ARBITRUM_USDC_CONTRACT_ADDRESS =
        0xaf88d065e77c8cC2239327C5EDb3A432268e5831;
    address public constant AAVE_POOL_ADDRESS =
        0x794a61358D6845594F94dc1DB02A252b5b4814aD;
    address public constant AAVE_ARBITRUM_USDCN_CONTRACT_ADDRESS =
        0x724dc807b04555b71ed48a6896b6F41593b8C637;

    IERC20 public usdc;
    IAavePool public aavePool;
    IERC20 public aaveReceiptToken;

    constructor(address _vault) {
        // , address _governance
        vault = _vault;
        // governance = _governance;
        usdc = IERC20(ARBITRUM_USDC_CONTRACT_ADDRESS);
        aavePool = IAavePool(AAVE_POOL_ADDRESS);
        aaveReceiptToken = IERC20(AAVE_ARBITRUM_USDCN_CONTRACT_ADDRESS);
    }

    modifier onlyVault() {
        require(msg.sender == vault, "Only vault can call");
        _;
    }

    function invest(uint256 amount) external onlyVault {
        SafeERC20.safeTransferFrom(usdc, msg.sender, address(this), amount);
        usdc.approve(address(aavePool), amount);
        aavePool.supply(address(usdc), amount, address(this), 0); // msg.sender or address(this)?
    }

    function withdraw(uint256 _amount) external onlyVault {
        aavePool.withdraw(address(usdc), _amount, msg.sender);
    }

    function totalSupply() external view returns (uint256) {
        return aaveReceiptToken.balanceOf(address(this));
    }

    receive() external payable {}
}
