// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC4626Upgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/// @dev ERC4626RewardsUpgradeable extends ERC4626Upgradeable and adds a reward system
abstract contract ERC4626RewardsUpgradeable is
    ERC4626Upgradeable,
    OwnableUpgradeable
{
    using SafeERC20 for IERC20;

    event RewardsSet(uint32 start, uint32 end, uint256 rate);
    event RewardsPerTokenUpdated(uint256 accumulated);
    event UserRewardsUpdated(
        address user,
        uint256 userRewards,
        uint256 paidRewardPerToken
    );
    event Claimed(address user, address receiver, uint256 claimed);

    struct RewardsInterval {
        uint32 start; // Start time for the rewardsToken schedule
        uint32 end; // End time for the rewardsToken schedule
        uint96 rate; // Wei rewarded per second among all token holders
    }

    struct RewardsPerToken {
        uint128 accumulated; // Accumulated rewards per token, scaled up by 1e18
        uint32 lastUpdated; // Last time the rewards per token accumulator was updated
    }

    struct UserRewards {
        uint128 accumulated; // Accumulated rewards for the user
        uint128 checkpoint; // RewardsPerToken the last time user rewards were updated
    }

    IERC20 public rewardToken;
    RewardsInterval public rewardsInterval;
    RewardsPerToken public rewardsPerToken;
    mapping(address => UserRewards) public accumulatedRewards;

    function setRewardToken(address _rewardToken) external onlyOwner {
        rewardToken = IERC20(_rewardToken);
    }

    /// @dev Set a rewards schedule
    function setRewardsInterval(
        uint256 start,
        uint256 end,
        uint256 totalRewards
    ) external onlyOwner {
        require(start < end, "Invalid interval");

        // A new rewards program can be set if one is not running
        require(
            block.timestamp < rewardsInterval.start ||
                block.timestamp > rewardsInterval.end,
            "Rewards ongoing"
        );

        // Update rewards per token
        _updateRewardsPerToken();

        uint256 rate = totalRewards / (end - start);
        rewardsInterval = RewardsInterval({
            start: uint32(start),
            end: uint32(end),
            rate: uint96(rate)
        });

        // Start accumulating new rewards
        rewardsPerToken.lastUpdated = uint32(start);

        emit RewardsSet(uint32(start), uint32(end), rate);
    }

    /// @notice Update the rewards per token accumulator
    function _updateRewardsPerToken() internal {
        if (block.timestamp < rewardsInterval.start) return;

        uint256 elapsed = block.timestamp < rewardsInterval.end
            ? block.timestamp - rewardsPerToken.lastUpdated
            : rewardsInterval.end - rewardsPerToken.lastUpdated;

        if (elapsed == 0 || totalSupply() == 0) return;

        rewardsPerToken.accumulated += uint128(
            (elapsed * rewardsInterval.rate * 1e18) / totalSupply()
        );
        rewardsPerToken.lastUpdated = uint32(block.timestamp);

        emit RewardsPerTokenUpdated(rewardsPerToken.accumulated);
    }

    /// @notice Update and store current rewards for a user
    function _updateUserRewards(address user) internal {
        _updateRewardsPerToken();
        UserRewards memory userRewards_ = accumulatedRewards[user];

        if (userRewards_.checkpoint == rewardsPerToken.accumulated) return;

        userRewards_.accumulated += uint128(
            (balanceOf(user) *
                (rewardsPerToken.accumulated - userRewards_.checkpoint)) / 1e18
        );
        userRewards_.checkpoint = rewardsPerToken.accumulated;

        accumulatedRewards[user] = userRewards_;
        emit UserRewardsUpdated(
            user,
            userRewards_.accumulated,
            userRewards_.checkpoint
        );
    }

    /// @notice Claim rewards for the caller
    function claimRewards(address to) public {
        _updateUserRewards(msg.sender);
        uint256 reward = accumulatedRewards[msg.sender].accumulated;
        require(reward > 0, "No rewards to claim");

        accumulatedRewards[msg.sender].accumulated = 0;
        rewardToken.safeTransfer(to, reward);

        emit Claimed(msg.sender, to, reward);
    }

    function _update(
        address from,
        address to,
        uint256 value
    ) internal virtual override {
        // Update rewards for the sender (if not minting)
        if (from != address(0)) {
            _updateUserRewards(from);
        }

        // Update rewards for the receiver (if not burning)
        if (to != address(0)) {
            _updateUserRewards(to);
        }

        // Call the super function to handle the actual token movement
        super._update(from, to, value);
    }
}
