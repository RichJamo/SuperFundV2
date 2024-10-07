import { ethers, upgrades, network } from "hardhat";
import { expect } from "chai";
import { Signer } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers"
import { UpgradeableVault, BaseExtraStrategy, IERC20 } from "../typechain";

import { BASE_USDC_ADDRESS } from "../../frontend/src/constants/index";
import { BASE_EXTRA_RECEIPT_TOKEN_ADDRESS } from "../../frontend/src/constants/index";
import { BASE_USDC_HOLDER_ADDRESS } from "../../frontend/src/constants/index";

describe("Vault and BaseExtraStrategy", function () {
  let amanaVault: UpgradeableVault;
  let strategy: BaseExtraStrategy;
  let usdc: IERC20;
  let extraToken: IERC20;
  let owner: Signer;
  let user1: Signer;
  let user2: Signer;
  const errorMargin = 5;
  const FeeRate = BigInt(1000); // 10% fee

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

  before(async () => {
    [owner, user1, user2] = await ethers.getSigners();
    console.log("Got signers");
    // Forked USDC contract and Extra Pool
    usdc = await ethers.getContractAt("IERC20", BASE_USDC_ADDRESS);
    extraToken = await ethers.getContractAt("IERC20", BASE_EXTRA_RECEIPT_TOKEN_ADDRESS);
    console.log("Got contracts");
    // Deploy the UpgradeableVault using OpenZeppelin's upgrade proxy pattern
    const Vault = await ethers.getContractFactory("UpgradeableVault", owner);
    console.log("Got Vault factory");
    // Use the upgrades library to deploy the proxy
    amanaVault = await upgrades.deployProxy(
      Vault,
      ["ExtraV3USDCVault", "AVU", BASE_USDC_ADDRESS, await owner.getAddress(), 1000],
      { initializer: "initialize" }
    );
    console.log("Deployed amanaVault");
    // Deploy BaseExtraStrategy contract and set the amanaVault address
    const BaseExtraStrategy = await ethers.getContractFactory("BaseExtraStrategy", owner);
    strategy = await BaseExtraStrategy.deploy("ExtraV3USDC", await amanaVault.getAddress(), BASE_USDC_ADDRESS, BASE_EXTRA_RECEIPT_TOKEN_ADDRESS);
    console.log("Deployed strategy");
    // Set the strategy address in the amanaVault
    await amanaVault.setStrategy(await strategy.getAddress());
    console.log("Set strategy address");


  });

  describe("BaseExtraStrategy Investment", function () {
    async function setup() {
      // Get signers
      // Impersonate USDC holder
      const usdcHolder = await ethers.getImpersonatedSigner(BASE_USDC_HOLDER_ADDRESS);
      console.log("Impersonated USDC holder");
      // Set the initial balances for user1 and user2
      const depositAmount1 = ethers.parseUnits("1000", 6); // 1000 USDC for user1
      const depositAmount2 = ethers.parseUnits("500", 6); // 500 USDC for user2
      console.log("Set deposit amounts");
      await usdc.connect(usdcHolder).transfer(await user1.getAddress(), depositAmount1);
      await usdc.connect(usdcHolder).transfer(await user2.getAddress(), depositAmount2);
      console.log("Transferred USDC to users");
      return { user1, user2, depositAmount1, depositAmount2, usdc, amanaVault };
    }
    it("should invest USDC into Extra via the strategy", async function () {
      console.log("Running test");
      const { user1, depositAmount1, usdc, amanaVault } = await loadFixture(setup);
      console.log("Loaded fixture");
      await usdc.connect(user1).approve(await amanaVault.getAddress(), depositAmount1);
      console.log("Approved USDC");
      // Deposit USDC into the amanaVault
      expect(await amanaVault.connect(user1).deposit(depositAmount1, await user1.getAddress())).to.changeTokenBalance(usdc, user1, depositAmount1);
      console.log("Deposited USDC");
      // Check that the strategy has invested in Extra
      const aBaseUSDCBalance = await extraToken.balanceOf(await strategy.getAddress());
      console.log("Got aBaseUSDCBalance");
      expect(aBaseUSDCBalance).to.be.closeTo(depositAmount1, errorMargin); // Should have 1000 aBaseUSDC tokens after investment
      expect(await amanaVault.totalAssets()).to.be.closeTo(depositAmount1, errorMargin); // Vault should have the same amount of assets
      expect(await amanaVault.balanceOf(await user1.getAddress())).to.equal(depositAmount1); // User should have 1000 amanaVault shares
    });

    it("should withdraw USDC from Extra via the strategy", async function () {
      const { user1, depositAmount1, usdc, amanaVault } = await loadFixture(setup);
      await usdc.connect(user1).approve(await amanaVault.getAddress(), depositAmount1);

      // Deposit USDC into the amanaVault
      await amanaVault.connect(user1).deposit(depositAmount1, await user1.getAddress());
      const withdrawAmount = depositAmount1; // 1000 USDC

      let aBaseUSDCBalance = await extraToken.balanceOf(await strategy.getAddress());
      // Withdraw USDC from the strategy
      expect(await amanaVault.connect(user1).withdraw(withdrawAmount, await user1.getAddress(), await user1.getAddress())).to.changeTokenBalance(usdc, user1, withdrawAmount);
      aBaseUSDCBalance = await extraToken.balanceOf(await strategy.getAddress());

      // Check that USDC is back in the amanaVault
      expect(aBaseUSDCBalance).to.be.closeTo(0, errorMargin); // Should have 0 aBaseUSDC tokens after investment
      expect(await amanaVault.totalAssets()).to.be.closeTo(0, errorMargin); // Vault should have close to 0 assets (small amount of interest)
      expect(await amanaVault.balanceOf(await user1.getAddress())).to.equal(0); // User should have 0 amanaVault shares
    });

    it("should handle deposits from two different users", async function () {
      const { user1, user2, depositAmount1, depositAmount2, usdc, amanaVault } = await loadFixture(setup);
      console.log("Loaded fixture");
      // User1 and User2 approve and deposit
      await usdc.connect(user1).approve(await amanaVault.getAddress(), depositAmount1);
      await usdc.connect(user2).approve(await amanaVault.getAddress(), depositAmount2);

      expect(await amanaVault.connect(user1).deposit(depositAmount1, await user1.getAddress())).to.changeTokenBalance(usdc, user1, depositAmount1);
      expect(await amanaVault.connect(user2).deposit(depositAmount2, await user2.getAddress())).to.changeTokenBalance(usdc, user2, depositAmount2);

      // Check total assets and user balances
      const totalAssets = await amanaVault.totalAssets();
      expect(totalAssets).to.be.closeTo(depositAmount1 + depositAmount2, errorMargin);

      const user1VaultBalance = await amanaVault.balanceOf(await user1.getAddress());
      const user2VaultBalance = await amanaVault.balanceOf(await user2.getAddress());

      expect(user1VaultBalance).to.equal(depositAmount1);
      expect(user2VaultBalance).to.be.closeTo(depositAmount2, errorMargin);
    });

    it("should handle withdrawals from two different users", async function () {
      const { user1, user2, depositAmount1, depositAmount2, usdc, amanaVault } = await loadFixture(setup);
      // User1 and User2 approve and deposit
      await usdc.connect(user1).approve(await amanaVault.getAddress(), depositAmount1);
      await usdc.connect(user2).approve(await amanaVault.getAddress(), depositAmount2);

      await amanaVault.connect(user1).deposit(depositAmount1, await user1.getAddress());
      await amanaVault.connect(user2).deposit(depositAmount2, await user2.getAddress());

      const withdrawAmount1 = depositAmount1; // 1000 USDC
      const withdrawAmount2 = depositAmount2; // 500 USDC

      // Withdraw for both users
      expect(await amanaVault.connect(user1).withdraw(withdrawAmount1, await user1.getAddress(), await user1.getAddress())).to.changeTokenBalance(usdc, user1, withdrawAmount1);
      expect(await amanaVault.connect(user2).withdraw(withdrawAmount2, await user2.getAddress(), await user2.getAddress())).to.changeTokenBalance(usdc, user2, withdrawAmount2);

      const vaultAssets = await amanaVault.totalAssets();
      expect(vaultAssets).to.be.closeTo(0, errorMargin); // Vault should have no assets after withdrawals
    });

    it("should pay a fee to the owner upon withdrawal", async function () {
      const { user1, depositAmount1, usdc, amanaVault } = await loadFixture(setup);
      await usdc.connect(user1).approve(await amanaVault.getAddress(), depositAmount1);

      // Deposit USDC into the amanaVault
      await amanaVault.connect(user1).deposit(depositAmount1, await user1.getAddress());

      // Increase time by 1 week, allowing interest to accumulate
      const ONE_WEEK_IN_SECONDS = 604800;
      await network.provider.send("evm_increaseTime", [ONE_WEEK_IN_SECONDS]);
      await network.provider.send("evm_mine"); // Mine a block after increasing time

      // Withdraw USDC from the strategy
      const withdrawAmount = depositAmount1; // 1000 USDC
      const vaultAssetsBeforeWithdraw = await amanaVault.totalAssets();
      const profitAmount = vaultAssetsBeforeWithdraw - depositAmount1;
      const feeAmount = profitAmount * FeeRate / BigInt(10000);
      expect(await amanaVault.connect(user1).withdraw(withdrawAmount, await user1.getAddress(), await user1.getAddress())).to.changeTokenBalance(usdc, owner, feeAmount);
    });
  });
});
