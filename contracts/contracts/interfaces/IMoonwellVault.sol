// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface IMoonwellVault {
    function deposit(uint256 assets, address receiver) external;
    function withdraw(uint256 assets, address receiver, address owner) external;
    function balanceOf(address account) external view returns (uint256);
    function convertToAssets(uint256 shares) external view returns (uint256);
}
