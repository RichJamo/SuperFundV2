// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IAaveReceiptToken is IERC20 {
    function POOL() external view returns (address);
}
