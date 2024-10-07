// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC4626Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/interfaces/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IStrategy.sol";

contract UpgradeableVault is
    Initializable,
    ERC20Upgradeable,
    ERC4626Upgradeable,
    UUPSUpgradeable,
    OwnableUpgradeable
{
    using SafeERC20 for IERC20;

    IERC20 private _asset;
    uint8 private _decimals;
    address public strategyAddress;
    address public treasuryAddress;
    uint16 public performanceFeeRate;
    uint256 private totalPrincipal;

    IERC20 public rewardToken;
    uint256 public rewardAmount;
    uint256 public rewardPerBlock;
    uint256 public lastRewardBlock;
    uint256 public startBlock;
    uint256 public endBlock;

    mapping(address => uint256) public rewards;

    mapping(address => uint256) private userPrincipal;

    event StrategyUpdated(address indexed newStrategy);
    event PerformanceFeePaid(address indexed user, uint256 amount);
    event PerformanceFeeUpdated(uint256 newFeeRate);
    event VaultInitialized(uint8 decimals, uint256 performanceFeeRate);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializer function to replace the constructor in upgradeable contracts.
     */
    function initialize(
        string memory name_,
        string memory symbol_,
        IERC20 asset_,
        address treasuryAddress_,
        uint16 performanceFeeRate_
    ) external initializer {
        require(treasuryAddress_ != address(0), "Invalid treasury address");
        __ERC20_init(name_, symbol_);
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();

        _asset = asset_;
        _decimals = IERC20Metadata(address(asset_)).decimals();
        treasuryAddress = treasuryAddress_;
        performanceFeeRate = performanceFeeRate_;
        emit VaultInitialized(_decimals, performanceFeeRate_);
    }

    /**
     * @dev UUPS upgrade authorization
     */
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}

    function setRewardToken(IERC20 rewardToken_) external onlyOwner {
        rewardToken = rewardToken_;
    }

    function setRewardDuration(
        uint256 startBlock_,
        uint256 endBlock_
    ) external onlyOwner {
        require(
            endBlock_ > startBlock_,
            "End block must be greater than start block"
        );
        startBlock = startBlock_;
        endBlock = endBlock_;
    }

    function setRewardAmount(uint256 rewardAmount_) external onlyOwner {
        require(rewardAmount_ > 0, "Reward amount must be greater than 0");
        rewardAmount = rewardAmount_;
    }

    function startCampaign() external onlyOwner {
        require(rewardToken != IERC20(address(0)), "Reward token not set");
        require(rewardAmount > 0, "Reward amount not set");
        require(endBlock > startBlock, "Invalid block range");
        lastRewardBlock = startBlock;
        rewardPerBlock = rewardAmount / (endBlock - startBlock); // Calculate rewards per block
    }

    function updateRewards(address user) internal {
        uint256 currentBlock = block.number;
        if (currentBlock > lastRewardBlock) {
            uint256 blocksSinceLastUpdate = currentBlock - lastRewardBlock;
            uint256 reward = blocksSinceLastUpdate * rewardPerBlock;
            rewards[user] += reward;
            lastRewardBlock = currentBlock;
        }
    }

    function claimRewards() public {
        updateRewards(msg.sender); // Update rewards first
        uint256 reward = rewards[msg.sender]; // Get the reward amount
        require(reward > 0, "No rewards to claim");
        rewards[msg.sender] = 0; // Reset rewards
        rewardToken.transfer(msg.sender, reward); // Transfer rewards
    }

    function setStrategy(address _strategyAddress) external onlyOwner {
        require(_strategyAddress != address(0), "Invalid strategy address");
        strategyAddress = _strategyAddress;
        emit StrategyUpdated(_strategyAddress);
    }

    function updateTreasuryAddress(
        address _treasuryAddress
    ) external onlyOwner {
        require(_treasuryAddress != address(0), "Invalid treasury address");
        treasuryAddress = _treasuryAddress;
    }

    function setPerformanceFee(uint16 newFeeRate) external onlyOwner {
        require(newFeeRate <= 2000, "Fee must be less than or equal to 20%");
        performanceFeeRate = newFeeRate;
        emit PerformanceFeeUpdated(newFeeRate);
    }

    function switchStrategy(address newStrategy) external onlyOwner {
        require(
            newStrategy != address(0),
            "New strategy is not a valid address"
        );
        require(
            newStrategy != strategyAddress,
            "New strategy must be different"
        );

        address oldStrategy = strategyAddress;
        strategyAddress = newStrategy;
        emit StrategyUpdated(newStrategy);

        uint256 strategyBalance = IStrategy(oldStrategy)
            .totalUnderlyingAssets();
        if (strategyBalance > 0) {
            IStrategy(oldStrategy).withdraw(strategyBalance);
        }

        uint256 vaultBalance = _asset.balanceOf(address(this));
        if (vaultBalance > 0) {
            bool success = _asset.approve(strategyAddress, vaultBalance);
            require(success, "Approval failed");
            IStrategy(strategyAddress).invest(vaultBalance);
        }
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

    /**
     * @dev Decimals are read from the underlying asset in the constructor and cached. If this fails (e.g., the asset
     * has not been created yet), the cached value is set to a default obtained by `super.decimals()` (which depends on
     * inheritance but is most likely 18). Override this function in order to set a guaranteed hardcoded value.
     * See {IERC20Metadata-decimals}.
     */
    function decimals()
        public
        view
        virtual
        override(ERC20Upgradeable, ERC4626Upgradeable)
        returns (uint8)
    {
        return _decimals;
    }

    /** @dev See {IERC4626-asset}. */
    function asset() public view virtual override returns (address) {
        // return address of asset on target chain?
        return address(_asset);
    }

    /** @dev See {IERC4626-totalAssets}. */
    function totalAssets() public view virtual override returns (uint256) {
        // Get the amount of USDC held directly by the vault
        uint256 usdcBalance = _asset.balanceOf(address(this));

        // Call the strategy to get the equivalent value of aArbUSDC in terms of USDC
        uint256 strategyUSDCValue = IStrategy(strategyAddress)
            .totalUnderlyingAssets();

        // Return the total assets: USDC held in the vault + USDC equivalent held in the strategy
        return usdcBalance + strategyUSDCValue;
    }

    /** @dev See {IERC4626-convertToShares}. */
    function convertToShares(
        uint256 assets
    ) public view virtual override returns (uint256 shares) {
        return _convertToShares(assets, Math.Rounding.Floor);
    }

    /** @dev See {IERC4626-convertToAssets}. */
    function convertToAssets(
        uint256 shares
    ) public view virtual override returns (uint256 assets) {
        uint256 userAssets = _convertToAssets(shares, Math.Rounding.Floor);
        return userAssets;
    }

    /** @dev See {IERC4626-maxDeposit}. */
    function maxDeposit(
        address
    ) public view virtual override returns (uint256) {
        return _isVaultCollateralized() ? type(uint256).max : 0;
    }

    /** @dev See {IERC4626-maxMint}. */
    function maxMint(address) public view virtual override returns (uint256) {
        return type(uint256).max;
    }

    /** @dev See {IERC4626-maxWithdraw}. */
    function maxWithdraw(
        address user
    ) public view virtual override returns (uint256) {
        return _convertToAssets(balanceOf(user), Math.Rounding.Floor);
    }

    /** @dev See {IERC4626-maxRedeem}. */
    function maxRedeem(
        address user
    ) public view virtual override returns (uint256) {
        return balanceOf(user);
    }

    /** @dev See {IERC4626-previewDeposit}. */
    function previewDeposit(
        uint256 assets
    ) public view virtual override returns (uint256) {
        return _convertToShares(assets, Math.Rounding.Floor);
    }

    /** @dev See {IERC4626-previewMint}. */
    function previewMint(
        uint256 shares
    ) public view virtual override returns (uint256) {
        return _convertToAssets(shares, Math.Rounding.Ceil);
    }

    /** @dev See {IERC4626-previewWithdraw}. */
    function previewWithdraw(
        uint256 assets
    ) public view virtual override returns (uint256) {
        return _convertToShares(assets, Math.Rounding.Ceil);
    }

    /** @dev See {IERC4626-previewRedeem}. */
    function previewRedeem(
        uint256 shares
    ) public view virtual override returns (uint256) {
        return _convertToAssets(shares, Math.Rounding.Floor);
    }

    /** @dev See {IERC4626-deposit}. */
    function deposit(
        uint256 assets,
        address receiver
    ) public virtual override returns (uint256) {
        require(
            assets <= maxDeposit(receiver),
            "ERC4626: deposit more than max"
        );

        updateRewards(receiver);

        uint256 shares = previewDeposit(assets);

        userPrincipal[receiver] += assets;
        totalPrincipal += assets;

        _deposit(_msgSender(), receiver, assets, shares);

        allocateToStrategy(assets);

        return shares;
    }

    function allocateToStrategy(uint256 amount) private {
        bool success = _asset.approve(strategyAddress, amount);
        require(success, "Approval failed");
        IStrategy(strategyAddress).invest(amount);
    }

    /** @dev See {IERC4626-mint}.
     *
     * As opposed to {deposit}, minting is allowed even if the vault is in a state where the price of a share is zero.
     * In this case, the shares will be minted without requiring any assets to be deposited.
     */
    function mint(
        uint256 shares,
        address receiver
    ) public virtual override returns (uint256) {
        require(shares <= maxMint(receiver), "ERC4626: mint more than max");

        updateRewards(receiver);

        uint256 assets = previewMint(shares);

        userPrincipal[receiver] += assets;
        totalPrincipal += assets;

        _deposit(_msgSender(), receiver, assets, shares);

        return assets;
    }

    /** @dev See {IERC4626-withdraw}. 
    user specifies amount in terms of the asset that they want to withdraw, e.g. 50 USDC 
    */
    function withdraw(
        uint256 assets,
        address receiver,
        address user
    ) public virtual override returns (uint256) {
        require(assets <= maxWithdraw(user), "ERC4626: withdraw more than max");

        updateRewards(user);

        uint256 shares = previewWithdraw(assets);

        uint256 feeWithdrawn = _calculateAndApplyFee(user, assets);

        IStrategy(strategyAddress).withdraw(assets + feeWithdrawn);
        if (feeWithdrawn > 0) {
            emit PerformanceFeePaid(user, feeWithdrawn);
            SafeERC20.safeTransfer(_asset, treasuryAddress, feeWithdrawn);
        }

        _withdraw(_msgSender(), receiver, user, assets, shares);
        return shares;
    }

    /** @dev See {IERC4626-redeem}. 
    user specifies how many shares they want to withdraw, e.g. 10 shares
    */
    function redeem(
        uint256 shares,
        address receiver,
        address user
    ) public virtual override returns (uint256) {
        require(shares <= maxRedeem(user), "ERC4626: redeem more than max");

        updateRewards(user);

        uint256 assets = previewRedeem(shares);

        uint256 feeWithdrawn = _calculateAndApplyFee(user, assets);

        IStrategy(strategyAddress).withdraw(assets + feeWithdrawn);

        if (feeWithdrawn > 0) {
            emit PerformanceFeePaid(user, feeWithdrawn);
            SafeERC20.safeTransfer(_asset, treasuryAddress, feeWithdrawn);
        }

        _withdraw(_msgSender(), receiver, user, assets, shares);

        return assets;
    }

    function _calculateAndApplyFee(
        address user,
        uint256 assets
    ) internal returns (uint256 feeWithdrawn) {
        uint256 principal = userPrincipal[user];
        uint256 totalUserAssets = convertToAssets(balanceOf(user));
        uint256 principalWithdrawn;
        uint256 profit;
        uint256 fee;

        if (totalUserAssets > principal) {
            profit = totalUserAssets - principal;

            fee = (profit * performanceFeeRate) / (10000 - performanceFeeRate);

            principalWithdrawn = (assets * principal) / totalUserAssets;
            uint256 profitWithdrawn = assets - principalWithdrawn;

            feeWithdrawn =
                (profit * performanceFeeRate * profitWithdrawn) /
                (profit * (10000 - performanceFeeRate));

            userPrincipal[user] -= principalWithdrawn;
        } else {
            principalWithdrawn = assets;
            feeWithdrawn = 0;
            userPrincipal[user] -= principalWithdrawn;
        }

        totalPrincipal -= principalWithdrawn;
    }

    /**
     * @dev Internal conversion function (from assets to shares) with support for rounding direction.
     *
     * Will revert if assets > 0, totalSupply > 0 and totalAssets = 0. That corresponds to a case where any asset
     * would represent an infinite amount of shares.
     */
    function _convertToShares(
        uint256 assets,
        Math.Rounding rounding
    ) internal view override returns (uint256 shares) {
        uint256 supply = totalSupply();
        uint256 totalAssetsNetOfFee;
        totalAssets() > totalPrincipal
            ? totalAssetsNetOfFee =
                totalAssets() -
                ((totalAssets() - totalPrincipal) * performanceFeeRate) /
                10000
            : totalAssetsNetOfFee = totalAssets();
        return
            (assets == 0 || supply == 0)
                ? _initialConvertToShares(assets, rounding)
                : Math.mulDiv(assets, supply, totalAssetsNetOfFee, rounding);
    }

    /**
     * @dev Internal conversion function (from assets to shares) to apply when the vault is empty.
     *
     * NOTE: Make sure to keep this function consistent with {_initialConvertToAssets} when overriding it.
     */
    function _initialConvertToShares(
        uint256 assets,
        Math.Rounding /*rounding*/
    ) internal view virtual returns (uint256 shares) {
        return assets;
    }

    /**
     * @dev Internal conversion function (from shares to assets) with support for rounding direction.
     */
    function _convertToAssets(
        uint256 shares,
        Math.Rounding rounding
    ) internal view override returns (uint256 assets) {
        uint256 supply = totalSupply();
        uint256 totalAssetsNetOfFee;
        totalAssets() > totalPrincipal
            ? totalAssetsNetOfFee =
                totalAssets() -
                ((totalAssets() - totalPrincipal) * performanceFeeRate) /
                10000
            : totalAssetsNetOfFee = totalAssets();
        return
            (supply == 0)
                ? _initialConvertToAssets(shares, rounding)
                : Math.mulDiv(shares, totalAssetsNetOfFee, supply, rounding);
    }

    /**
     * @dev Internal conversion function (from shares to assets) to apply when the vault is empty.
     *
     * NOTE: Make sure to keep this function consistent with {_initialConvertToShares} when overriding it.
     */
    function _initialConvertToAssets(
        uint256 shares,
        Math.Rounding /*rounding*/
    ) internal view virtual returns (uint256 assets) {
        return shares;
    }

    /**
     * @dev Deposit/mint common workflow.
     */
    function _deposit(
        address caller,
        address receiver,
        uint256 assets,
        uint256 shares
    ) internal override {
        // If _asset is ERC777, `transferFrom` can trigger a reenterancy BEFORE the transfer happens through the
        // `tokensToSend` hook. On the other hand, the `tokenReceived` hook, that is triggered after the transfer,
        // calls the vault, which is assumed not malicious.
        //
        // Conclusion: we need to do the transfer before we mint so that any reentrancy would happen before the
        // assets are transferred and before the shares are minted, which is a valid state.
        // slither-disable-next-line reentrancy-no-eth
        SafeERC20.safeTransferFrom(_asset, caller, address(this), assets);
        _mint(receiver, shares);

        emit Deposit(caller, receiver, assets, shares);
    }

    /**
     * @dev Withdraw/redeem common workflow.
     */
    function _withdraw(
        address caller,
        address receiver,
        address user,
        uint256 assets,
        uint256 shares
    ) internal override {
        if (caller != user) {
            _spendAllowance(user, caller, shares);
        }

        // If _asset is ERC777, `transfer` can trigger a reentrancy AFTER the transfer happens through the
        // `tokensReceived` hook. On the other hand, the `tokensToSend` hook, that is triggered before the transfer,
        // calls the vault, which is assumed not malicious.
        //
        // Conclusion: we need to do the transfer after the burn so that any reentrancy would happen after the
        // shares are burned and after the assets are transferred, which is a valid state.
        _burn(user, shares);
        SafeERC20.safeTransfer(_asset, receiver, assets);

        emit Withdraw(caller, receiver, user, assets, shares);
    }

    /**
     * @dev Checks if vault is "healthy" in the sense of having assets backing the circulating shares.
     */
    function _isVaultCollateralized() private view returns (bool) {
        return totalAssets() > 0 || totalSupply() == 0;
    }
}
