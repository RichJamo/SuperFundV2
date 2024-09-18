import { ethers } from "hardhat";
import { expect } from "chai";
import { Contract, Signer } from "ethers";
import { IERC20 } from "../typechain-types";

describe("Vault and AaveStrategy", function () {
  let vault: Contract;
  let strategy: Contract;
  let usdc: IERC20;
  let aavePool: Contract;
  let aaveToken: IERC20;
  let owner: Signer;
  let user1: Signer;
  let user2: Signer;
  // other tests:
  // - withdraw max amount
  // - withdraw amount greater than balance
  // - deposit amount greater than balance
  // - deposit amount less than minimum deposit
  // - withdraw amount less than minimum withdraw
  // - deposit and withdraw in quick succession
  //  - check for reentrancy attacks
  //  - check for slippage on deposits and withdrawals
  //  - check for gas usage on deposits and withdrawals
  //  - check for edge cases with zero balances
  //  - check for edge cases with maximum balances
  //  - check for edge cases with minimum balances
  //  - check for edge cases with maximum deposits
  //  - check for edge cases with minimum deposits
  //  - check for edge cases with maximum withdrawals
  //  - check for edge cases with minimum withdrawals
  //  - check for withdrawal in shares rather than assets

  // Addresses for USDC and Aave Pool on Arbitrum
  const ARBITRUM_USDC_ADDRESS = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
  const AAVE_POOL_ADDRESS = "0x794a61358D6845594F94dc1DB02A252b5b4814aD";
  const AAVE_RECEIPT_TOKEN_ADDRESS = "0x724dc807b04555b71ed48a6896b6F41593b8C637";
  const USDC_HOLDER_ADDRESS = "0xf89d7b9c864f589bbF53a82105107622B35EaA40";

  before(async () => {
    // Get signers
    [owner, user1, user2] = await ethers.getSigners();

    // Forked USDC contract and Aave Pool
    usdc = await ethers.getContractAt("IERC20", ARBITRUM_USDC_ADDRESS);
    aavePool = await ethers.getContractAt("IAavePool", AAVE_POOL_ADDRESS);
    aaveToken = await ethers.getContractAt("IERC20", AAVE_RECEIPT_TOKEN_ADDRESS);

    // Deploy Vault contract
    const Vault = await ethers.getContractFactory("GenericVault", owner);
    vault = await Vault.deploy("GenericVault", "GV", ARBITRUM_USDC_ADDRESS);

    // Deploy AaveStrategy contract and set the vault address
    const AaveStrategy = await ethers.getContractFactory("AaveStrategy", owner);
    strategy = await AaveStrategy.deploy(vault.address);

    // Set the strategy address in the vault
    await vault.setStrategy(strategy.address);

    // Impersonate USDC holder
    const usdcHolder = await ethers.getImpersonatedSigner(USDC_HOLDER_ADDRESS);

    // Set the initial balances for user1 and user2
    const depositAmount1 = ethers.utils.parseUnits("1000", 6); // 1000 USDC for user1
    const depositAmount2 = ethers.utils.parseUnits("500", 6); // 500 USDC for user2

    await usdc.connect(usdcHolder).transfer(await user1.getAddress(), depositAmount1);
    await usdc.connect(usdcHolder).transfer(await user2.getAddress(), depositAmount2);
  });

  describe("AaveStrategy Investment", function () {
    it("should invest USDC into Aave via the strategy", async function () {
      const depositAmount = ethers.utils.parseUnits("1000", 6); // 1000 USDC
      await usdc.connect(user1).approve(vault.address, depositAmount);

      // Deposit USDC into the vault
      await vault.connect(user1).deposit(depositAmount, await user1.getAddress());

      // Check that the strategy has invested in Aave
      const aArbUSDCBalance = await aaveToken.balanceOf(strategy.address);

      expect(aArbUSDCBalance).to.be.closeTo(depositAmount, 5); // Should have 1000 aArbUSDC tokens after investment
      expect(await vault.totalAssets()).to.be.closeTo(depositAmount, 5); // Vault should have the same amount of assets
      expect(await usdc.balanceOf(await user1.getAddress())).to.equal(0); // User should have 0 USDC after deposit
      expect(await vault.balanceOf(await user1.getAddress())).to.equal(depositAmount); // User should have 1000 vault shares
    });

    it("should withdraw USDC from Aave via the strategy", async function () {
      const withdrawAmount = ethers.utils.parseUnits("1000", 6); // 1000 USDC

      let aArbUSDCBalance = await aaveToken.balanceOf(strategy.address);
      // Withdraw USDC from the strategy
      await vault.connect(user1).withdraw(withdrawAmount, await user1.getAddress(), await user1.getAddress());
      aArbUSDCBalance = await aaveToken.balanceOf(strategy.address);

      // Check that USDC is back in the vault
      const userBalance = await usdc.balanceOf(user1.getAddress());
      expect(aArbUSDCBalance).to.be.closeTo(0, 5); // Should have 0 aArbUSDC tokens after investment
      expect(await vault.totalAssets()).to.be.closeTo(0, 5); // Vault should have close to 0 assets (small amount of interest)
      expect(await vault.balanceOf(await user1.getAddress())).to.equal(0); // User should have 0 vault shares
      expect(userBalance).to.equal(withdrawAmount);
    });

    it("should handle deposits from two different users", async function () {
      const depositAmount1 = ethers.utils.parseUnits("1000", 6); // 1000 USDC
      const depositAmount2 = ethers.utils.parseUnits("500", 6); // 500 USDC

      // User1 and User2 approve and deposit
      await usdc.connect(user1).approve(vault.address, depositAmount1);
      await usdc.connect(user2).approve(vault.address, depositAmount2);

      await vault.connect(user1).deposit(depositAmount1, await user1.getAddress());
      await vault.connect(user2).deposit(depositAmount2, await user2.getAddress());

      // Check total assets and user balances
      const totalAssets = await vault.totalAssets();
      expect(totalAssets).to.be.closeTo(depositAmount1.add(depositAmount2), 5);

      const user1VaultBalance = await vault.balanceOf(await user1.getAddress());
      const user2VaultBalance = await vault.balanceOf(await user2.getAddress());

      expect(user1VaultBalance).to.equal(depositAmount1);
      expect(user2VaultBalance).to.be.closeTo(depositAmount2, 5);
    });

    it("should handle withdrawals from two different users", async function () {
      const withdrawAmount1 = ethers.utils.parseUnits("1000", 6); // 1000 USDC
      const withdrawAmount2 = ethers.utils.parseUnits("500", 6); // 500 USDC

      // Withdraw for both users
      await vault.connect(user1).withdraw(withdrawAmount1, await user1.getAddress(), await user1.getAddress());
      await vault.connect(user2).withdraw(withdrawAmount2, await user2.getAddress(), await user2.getAddress());

      // Check vault balance and user USDC balances after withdrawal
      const user1USDCBalance = await usdc.balanceOf(await user1.getAddress());
      const user2USDCBalance = await usdc.balanceOf(await user2.getAddress());

      expect(user1USDCBalance).to.equal(withdrawAmount1);
      expect(user2USDCBalance).to.equal(withdrawAmount2);

      const vaultAssets = await vault.totalAssets();
      expect(vaultAssets).to.be.closeTo(0, 5); // Vault should have no assets after withdrawals
    });
  });
});
