// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface IExtraPool {
    function depositAndStake(
        uint256 reserveId,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode
    ) external payable returns (uint256);

    function unStakeAndWithdraw(
        uint256 reserveId,
        uint256 eTokenAmount,
        address to,
        bool receiveNativeETH
    ) external returns (uint256);

    struct PositionStatus {
        uint256 reserveId;
        address user;
        uint256 eTokenStaked;
        uint256 eTokenUnStaked;
        uint256 liquidity;
    }

    struct ReserveData {
        uint256 reserveId;
        address reserveAddress;
        uint256 eTokenToReserveExchangeRate;
        uint256 reserveToETokenExchangeRate;
    }

    function getPositionStatus(
        uint256[] calldata reserveIdArr,
        address user
    ) external view returns (PositionStatus[] memory);

    function exchangeRateOfReserve(
        uint256 reserveId
    ) external view returns (uint256);
}
