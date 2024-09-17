// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IStrategy {
    function invest(uint256 amount) external;

    function withdraw(uint256 _amount) external;
}
