// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface ICompoundVault {
    function supply(address asset, uint256 amount) external;
    function withdraw(address asset, uint256 amount) external;
    function withdrawFrom(
        address src,
        address to,
        address asset,
        uint256 amount
    ) external;
    function balanceOf(address account) external view returns (uint256);
    // function convertToAssets(uint256 shares) external view returns (uint256);
}
