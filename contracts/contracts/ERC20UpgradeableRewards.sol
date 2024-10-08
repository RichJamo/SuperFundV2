// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol"; // Adding ownership functionality

contract ERC20UpgradeableRewards is ERC20Upgradeable, OwnableUpgradeable {
    using SafeERC20 for IERC20;
    using Cast for uint256;

    IERC20 public rewardsToken;

    struct RewardsInterval {
        uint32 start;
        uint32 end;
        uint96 rate;
    }

    struct RewardsPerToken {
        uint128 accumulated;
        uint32 lastUpdated;
    }

    struct UserRewards {
        uint128 accumulated;
        uint128 checkpoint;
    }

    RewardsInterval public rewardsInterval;
    RewardsPerToken public rewardsPerToken;
    mapping(address => UserRewards) public userRewards;

    event RewardsUpdated(uint256 accumulated);
    event UserRewardsUpdated(
        address indexed user,
        uint256 userRewards,
        uint256 paidRewardPerToken
    );

    function initialize(
        IERC20 _rewardsToken,
        string memory name,
        string memory symbol,
        address owner // Add owner initialization
    ) public initializer {
        rewardsToken = _rewardsToken;
        __ERC20_init(name, symbol);
        __Ownable_init(msg.sender); // Initialize ownership functionality
        transferOwnership(owner); // Set the contract's owner
    }

    /// @dev Set a new rewards schedule. Only the owner can call this.
    function setRewards(
        uint32 start,
        uint32 end,
        uint256 totalRewards
    ) external onlyOwner {
        require(start < end, "Invalid interval");

        uint256 rate = totalRewards / (end - start);
        rewardsInterval = RewardsInterval({
            start: start,
            end: end,
            rate: uint96(rate)
        });
        rewardsPerToken.lastUpdated = start;
    }

    /// @notice Overrides the OpenZeppelin `_update` function to track rewards when minting, burning, or transferring tokens
    function _update(
        address from,
        address to,
        uint256 value
    ) internal virtual override {
        // Call update for both from and to, or mint/burn if applicable
        if (from != address(0)) {
            _updateUserRewards(from);
        }
        if (to != address(0)) {
            _updateUserRewards(to);
        }

        // Call the original _update logic for minting, burning, or transferring
        super._update(from, to, value);
    }

    /// @dev Update user rewards based on their balance
    function _updateUserRewards(address user) internal {
        RewardsPerToken memory currentPerToken = _updateRewardsPerToken();
        UserRewards memory currentUserRewards = userRewards[user];

        if (currentUserRewards.checkpoint != currentPerToken.accumulated) {
            currentUserRewards.accumulated += _calculateUserRewards(
                balanceOf(user),
                currentUserRewards.checkpoint,
                currentPerToken.accumulated
            ).u128();
            currentUserRewards.checkpoint = currentPerToken.accumulated;
        }

        userRewards[user] = currentUserRewards;
        emit UserRewardsUpdated(
            user,
            currentUserRewards.accumulated,
            currentUserRewards.checkpoint
        );
    }

    /// @dev Calculate rewards per token
    function _updateRewardsPerToken()
        internal
        returns (RewardsPerToken memory)
    {
        RewardsPerToken memory current = rewardsPerToken;
        uint32 lastUpdate = current.lastUpdated;
        if (block.timestamp < rewardsInterval.start || totalSupply() == 0) {
            return current;
        }

        uint32 elapsed = uint32(block.timestamp - lastUpdate);
        if (elapsed == 0) {
            return current;
        }

        current.accumulated += uint128(
            (elapsed * rewardsInterval.rate * 1e18) / totalSupply()
        );
        current.lastUpdated = uint32(block.timestamp);

        rewardsPerToken = current;
        emit RewardsUpdated(current.accumulated);
        return current;
    }

    /// @dev Calculate user rewards between checkpoints
    function _calculateUserRewards(
        uint256 userBalance,
        uint256 previousCheckpoint,
        uint256 currentCheckpoint
    ) internal pure returns (uint256) {
        return (userBalance * (currentCheckpoint - previousCheckpoint)) / 1e18;
    }
}

library Cast {
    function u128(uint256 x) internal pure returns (uint128 y) {
        require(x <= type(uint128).max, "Cast overflow");
        y = uint128(x);
    }

    function u96(uint256 x) internal pure returns (uint96 y) {
        require(x <= type(uint96).max, "Cast overflow");
        y = uint96(x);
    }

    function u32(uint256 x) internal pure returns (uint32 y) {
        require(x <= type(uint32).max, "Cast overflow");
        y = uint32(x);
    }
}
