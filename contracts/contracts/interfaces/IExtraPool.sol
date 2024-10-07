// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface IExtraPool {
    function depositAndStake(
        uint256 reserveId,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode
    ) external payable;

    function unStakeAndWithdraw(
        uint256 reserveId,
        uint256 eTokenAmount,
        address to,
        bool receiveNativeETH
    ) external;

    function getReserveNormalizedIncome(
        address asset
    ) external view returns (uint256);
}
