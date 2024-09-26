// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v4.8.1) (token/ERC20/extensions/ERC4626.sol)

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/interfaces/IERC4626.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IStrategy.sol";
/**
 * @dev Implementation of the ERC4626 "Tokenized Vault Standard" as defined in
 * https://eips.ethereum.org/EIPS/eip-4626[EIP-4626].
 *
 * This extension allows the minting and burning of "shares" (represented using the ERC20 inheritance) in exchange for
 * underlying "assets" through standardized {deposit}, {mint}, {redeem} and {burn} workflows. This contract extends
 * the ERC20 standard. Any additional extensions included along it would affect the "shares" token represented by this
 * contract and not the "assets" token which is an independent contract.
 *
 * CAUTION: When the vault is empty or nearly empty, deposits are at high risk of being stolen through frontrunning with
 * a "donation" to the vault that inflates the price of a share. This is variously known as a donation or inflation
 * attack and is essentially a problem of slippage. Vault deployers can protect against this attack by making an initial
 * deposit of a non-trivial amount of the asset, such that price manipulation becomes infeasible. Withdrawals may
 * similarly be affected by slippage. Users can protect against this attack as well unexpected slippage in general by
 * verifying the amount received is as expected, using a wrapper that performs these checks such as
 * https://github.com/fei-protocol/ERC4626#erc4626router-and-base[ERC4626Router].
 *
 * _Available since v4.7._
 */
contract GenericVault is ERC20, IERC4626, Ownable {
    using Math for uint256;

    IERC20 private immutable _asset;
    uint8 private immutable _decimals;
    address public strategyAddress;
    address public treasuryAddress;
    uint256 public performanceFeeRate = 1000; // 10%
    uint256 private totalPrincipal;

    struct AssetBreakdown {
        uint256 principal; // Total user deposits
        uint256 profit; // Profit above the principal
        uint256 fee; // Performance fee on the profit
    }

    mapping(address => AssetBreakdown) private userAssetBreakdown;

    mapping(address => uint256) private netDeposits;

    event StrategyUpdated(address indexed newStrategy);
    event PerformanceFeePaid(address indexed user, uint256 amount);

    /**
     * @dev Set the underlying asset contract. This must be an ERC20-compatible contract (ERC20 or ERC777).
     */
    constructor(
        string memory name_,
        string memory symbol_,
        IERC20 asset_,
        address treasuryAddress_,
        uint256 performanceFeeRate_ // 1000 = 10%
    ) ERC20(name_, symbol_) {
        (bool success, uint8 assetDecimals) = _tryGetAssetDecimals(asset_);
        _decimals = success ? assetDecimals : super.decimals();
        _asset = asset_;
        treasuryAddress = treasuryAddress_;
        performanceFeeRate = performanceFeeRate_;
    }

    function setStrategy(address _strategyAddress) external onlyOwner {
        require(_strategyAddress != address(0), "Invalid strategy address");
        strategyAddress = _strategyAddress;
        emit StrategyUpdated(_strategyAddress);
    }

    function setPerformanceFee(uint256 newFeeRate) external onlyOwner {
        require(newFeeRate <= 2000, "Fee must be less than or equal to 20%");
        performanceFeeRate = newFeeRate;
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

        uint256 strategyBalance = IStrategy(strategyAddress)
            .totalUnderlyingAssets();
        if (strategyBalance > 0) {
            IStrategy(strategyAddress).withdraw(strategyBalance);
        }

        strategyAddress = newStrategy;
        emit StrategyUpdated(newStrategy);

        uint256 vaultBalance = _asset.balanceOf(address(this));
        if (vaultBalance > 0) {
            _asset.approve(strategyAddress, vaultBalance);
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
     * @dev Attempts to fetch the asset decimals. A return value of false indicates that the attempt failed in some way.
     */
    function _tryGetAssetDecimals(
        IERC20 asset_
    ) private view returns (bool, uint8) {
        (bool success, bytes memory encodedDecimals) = address(asset_)
            .staticcall(
                abi.encodeWithSelector(IERC20Metadata.decimals.selector)
            );
        if (success && encodedDecimals.length >= 32) {
            uint256 returnedDecimals = abi.decode(encodedDecimals, (uint256));
            if (returnedDecimals <= type(uint8).max) {
                return (true, uint8(returnedDecimals));
            }
        }
        return (false, 0);
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
        override(IERC20Metadata, ERC20)
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
        return _convertToShares(assets, Math.Rounding.Down);
    }

    /** @dev See {IERC4626-convertToAssets}. */
    function convertToAssets(
        uint256 shares
    ) public view virtual override returns (uint256 assets) {
        uint256 userAssets = _convertToAssets(shares, Math.Rounding.Down);
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
        address owner
    ) public view virtual override returns (uint256) {
        return _convertToAssets(balanceOf(owner), Math.Rounding.Down);
    }

    /** @dev See {IERC4626-maxRedeem}. */
    function maxRedeem(
        address owner
    ) public view virtual override returns (uint256) {
        return balanceOf(owner);
    }

    /** @dev See {IERC4626-previewDeposit}. */
    function previewDeposit(
        uint256 assets
    ) public view virtual override returns (uint256) {
        return _convertToShares(assets, Math.Rounding.Down);
    }

    /** @dev See {IERC4626-previewMint}. */
    function previewMint(
        uint256 shares
    ) public view virtual override returns (uint256) {
        return _convertToAssets(shares, Math.Rounding.Up);
    }

    /** @dev See {IERC4626-previewWithdraw}. */
    function previewWithdraw(
        uint256 assets
    ) public view virtual override returns (uint256) {
        return _convertToShares(assets, Math.Rounding.Up);
    }

    /** @dev See {IERC4626-previewRedeem}. */
    function previewRedeem(
        uint256 shares
    ) public view virtual override returns (uint256) {
        return _convertToAssets(shares, Math.Rounding.Down);
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

        uint256 shares = previewDeposit(assets);
        _deposit(_msgSender(), receiver, assets, shares);

        // Update the user's principal
        userAssetBreakdown[receiver].principal += assets; // TODO check for re-entrancy
        totalPrincipal += assets;
        // Allocate the deposited assets to the strategy
        allocateToStrategy(assets);

        return shares;
    }

    function allocateToStrategy(uint256 amount) private {
        _asset.approve(strategyAddress, amount);
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

        uint256 assets = previewMint(shares);
        _deposit(_msgSender(), receiver, assets, shares);

        userAssetBreakdown[receiver].principal += assets;
        totalPrincipal += assets;

        return assets;
    }

    /** @dev See {IERC4626-withdraw}. 
    user specifies amount in terms of the asset that they want to withdraw, e.g. 50 USDC 
    */
    function withdraw(
        uint256 assets,
        address receiver,
        address owner
    ) public virtual override returns (uint256) {
        require(
            assets <= maxWithdraw(owner),
            "ERC4626: withdraw more than max"
        );

        uint256 shares = previewWithdraw(assets);

        (
            uint256 principalWithdrawn,
            uint256 feeWithdrawn
        ) = _calculateAndApplyFee(owner, assets);

        IStrategy(strategyAddress).withdraw(assets + feeWithdrawn);
        if (feeWithdrawn > 0) {
            SafeERC20.safeTransfer(_asset, treasuryAddress, feeWithdrawn);
            emit PerformanceFeePaid(owner, feeWithdrawn);
        }

        _withdraw(_msgSender(), receiver, owner, assets, shares);
        return shares;
    }

    /** @dev See {IERC4626-redeem}. 
    user specifies how many shares they want to withdraw, e.g. 10 shares
    */
    function redeem(
        uint256 shares,
        address receiver,
        address owner
    ) public virtual override returns (uint256) {
        require(shares <= maxRedeem(owner), "ERC4626: redeem more than max");

        uint256 assets = previewRedeem(shares);

        (
            uint256 principalWithdrawn,
            uint256 feeWithdrawn
        ) = _calculateAndApplyFee(owner, assets);

        IStrategy(strategyAddress).withdraw(assets + feeWithdrawn);

        if (feeWithdrawn > 0) {
            SafeERC20.safeTransfer(_asset, treasuryAddress, feeWithdrawn);
            emit PerformanceFeePaid(owner, feeWithdrawn);
        }

        _withdraw(_msgSender(), receiver, owner, assets, shares);

        return assets;
    }

    function _calculateAndApplyFee(
        address owner,
        uint256 assets
    ) internal returns (uint256 principalWithdrawn, uint256 feeWithdrawn) {
        // Get the user’s current asset breakdown
        AssetBreakdown storage breakdown = userAssetBreakdown[owner];
        uint256 totalUserAssets = convertToAssets(balanceOf(owner)); // Convert user's shares to total assets

        if (totalUserAssets > breakdown.principal) {
            breakdown.profit = totalUserAssets - breakdown.principal;

            // Calculate the fee as a percentage of the total profit
            breakdown.fee =
                (breakdown.profit * performanceFeeRate) /
                (10000 - performanceFeeRate);

            // Ensure the user’s withdrawal/redeem is split correctly
            principalWithdrawn =
                (assets * breakdown.principal) /
                totalUserAssets;
            uint256 profitWithdrawn = assets - principalWithdrawn;
            feeWithdrawn = (breakdown.fee * profitWithdrawn) / breakdown.profit;

            // Update user’s remaining balances
            breakdown.principal -= principalWithdrawn;
            breakdown.profit -= profitWithdrawn;
            breakdown.fee -= feeWithdrawn;
        } else {
            principalWithdrawn = assets;
            feeWithdrawn = 0;
            breakdown.principal -= principalWithdrawn;
            breakdown.profit = 0;
            breakdown.fee = 0;
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
    ) internal view virtual returns (uint256 shares) {
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
                : assets.mulDiv(supply, totalAssetsNetOfFee, rounding);
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
    ) internal view virtual returns (uint256 assets) {
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
                : shares.mulDiv(totalAssetsNetOfFee, supply, rounding);
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
    ) internal virtual {
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
        address owner,
        uint256 assets,
        uint256 shares
    ) internal virtual {
        if (caller != owner) {
            _spendAllowance(owner, caller, shares);
        }

        // If _asset is ERC777, `transfer` can trigger a reentrancy AFTER the transfer happens through the
        // `tokensReceived` hook. On the other hand, the `tokensToSend` hook, that is triggered before the transfer,
        // calls the vault, which is assumed not malicious.
        //
        // Conclusion: we need to do the transfer after the burn so that any reentrancy would happen after the
        // shares are burned and after the assets are transferred, which is a valid state.
        _burn(owner, shares);
        SafeERC20.safeTransfer(_asset, receiver, assets);

        emit Withdraw(caller, receiver, owner, assets, shares);
    }

    /**
     * @dev Checks if vault is "healthy" in the sense of having assets backing the circulating shares.
     */
    function _isVaultCollateralized() private view returns (bool) {
        return totalAssets() > 0 || totalSupply() == 0;
    }
}
