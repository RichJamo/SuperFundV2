import { ethers, network } from "hardhat";
import { expect } from "chai";
import { Contract, Signer } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers"

import { IERC20 } from "../typechain-types";
import { IERC4626 } from "../typechain-types";
import { BASE_USDC_ADDRESS } from "../../frontend/src/constants/index";
import { MOONWELL_BASE_USDC_VAULT_ADDRESS } from "../../frontend/src/constants/index";
import { BASE_USDC_HOLDER_ADDRESS } from "../../frontend/src/constants/index";
import { BigNumber } from "ethers";
import { deposit } from "@zetachain/toolkit/client";

describe("Vault and BaseMoonwellStrategy", function () {
  let amanaVault: Contract;
  let strategy: Contract;
  let usdc: IERC20;
  let moonwellVault: IERC4626;
  let owner: Signer;
  let user1: Signer;
  let user2: Signer;
  const errorMargin = 5;
  const withdrawPercentage = 100;
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


  describe("BaseMoonwellStrategy Investment", function () {
    async function setup() {
      // Get signers
      [owner, user1, user2] = await ethers.getSigners();

      // Forked USDC contract and Moonwell Pool
      usdc = await ethers.getContractAt("IERC20", BASE_USDC_ADDRESS);
      moonwellVault = await ethers.getContractAt("IERC4626", MOONWELL_BASE_USDC_VAULT_ADDRESS);

      // Deploy Vault contract
      const Vault = await ethers.getContractFactory("GenericVault", owner);
      amanaVault = await Vault.deploy("GenericVault", "GV", BASE_USDC_ADDRESS);

      // Deploy BaseMoonwellStrategy contract and set the amanaVault address
      const BaseMoonwellStrategy = await ethers.getContractFactory("BaseMoonwellStrategy", owner);
      strategy = await BaseMoonwellStrategy.deploy(amanaVault.address, BASE_USDC_ADDRESS, MOONWELL_BASE_USDC_VAULT_ADDRESS);

      // Set the strategy address in the amanaVault
      await amanaVault.setStrategy(strategy.address);

      // Impersonate USDC holder
      const usdcHolder = await ethers.getImpersonatedSigner(BASE_USDC_HOLDER_ADDRESS);

      // Set the initial balances for user1 and user2
      const depositAmount1 = ethers.utils.parseUnits("1000", 6); // 1000 USDC for user1
      const depositAmount2 = ethers.utils.parseUnits("500", 6); // 500 USDC for user2

      await usdc.connect(usdcHolder).transfer(await user1.getAddress(), depositAmount1);
      await usdc.connect(usdcHolder).transfer(await user2.getAddress(), depositAmount2);

      return { user1, user2, depositAmount1, depositAmount2, usdc, amanaVault };
    }
    it("should invest USDC into Moonwell via the strategy", async function () {
      const { user1, depositAmount1, usdc, amanaVault } = await loadFixture(setup);

      await usdc.connect(user1).approve(amanaVault.address, depositAmount1);

      expect(await amanaVault.connect(user1).deposit(depositAmount1, await user1.getAddress())).to.changeTokenBalance(usdc, user1, depositAmount1);

      const mBaseUSDCBalance = await moonwellVault.balanceOf(strategy.address);

      expect(mBaseUSDCBalance).to.be.gt(0);
      expect(await amanaVault.totalAssets()).to.be.closeTo(depositAmount1, errorMargin); // Vault should have the same amount of assets
      expect(await amanaVault.balanceOf(await user1.getAddress())).to.equal(depositAmount1); // User should have 1000 vault shares
    });

    it("should withdraw USDC from Moonwell via the strategy", async function () {
      const { user1, depositAmount1, usdc, amanaVault } = await loadFixture(setup);

      await usdc.connect(user1).approve(amanaVault.address, depositAmount1);
      await amanaVault.connect(user1).deposit(depositAmount1, await user1.getAddress())

      const withdrawAmount = depositAmount1.mul(withdrawPercentage).div(100);

      expect(await amanaVault.connect(user1).withdraw(withdrawAmount, await user1.getAddress(), await user1.getAddress())).to.changeTokenBalance(usdc, user1, withdrawAmount);

      let totalAssets = await amanaVault.totalAssets();
      let amanaUserBalance = await amanaVault.balanceOf(await user1.getAddress());

      expect(totalAssets).to.be.closeTo(0, errorMargin); // Vault should have close to 0 assets (small amount of interest)
      expect(amanaUserBalance).to.equal(0); // User should have 0 amanaVault shares
    });

    it("should handle deposits from two different users", async function () {
      const { user1, user2, depositAmount1, depositAmount2, usdc, amanaVault } = await loadFixture(setup);

      // User1 and User2 approve and deposit
      await usdc.connect(user1).approve(amanaVault.address, depositAmount1);
      await usdc.connect(user2).approve(amanaVault.address, depositAmount2);

      await amanaVault.connect(user1).deposit(depositAmount1, await user1.getAddress());
      await amanaVault.connect(user2).deposit(depositAmount2, await user2.getAddress());

      const totalAssets = await amanaVault.totalAssets();
      expect(totalAssets).to.be.closeTo(depositAmount1.add(depositAmount2), errorMargin);

      const user1VaultBalance = await amanaVault.balanceOf(await user1.getAddress());
      const user2VaultBalance = await amanaVault.balanceOf(await user2.getAddress());

      expect(user1VaultBalance).to.equal(depositAmount1);
      expect(user2VaultBalance).to.be.closeTo(depositAmount2, errorMargin);
    });

    it("should handle withdrawals from two different users", async function () {
      const { user1, user2, depositAmount1, depositAmount2, usdc, amanaVault } = await loadFixture(setup);
      await usdc.connect(user1).approve(amanaVault.address, depositAmount1);
      await usdc.connect(user2).approve(amanaVault.address, depositAmount2);

      await amanaVault.connect(user1).deposit(depositAmount1, await user1.getAddress());
      await amanaVault.connect(user2).deposit(depositAmount2, await user2.getAddress());

      const withdrawAmount1 = depositAmount1.mul(withdrawPercentage).div(100); // 1000 USDC
      const withdrawAmount2 = depositAmount2.mul(withdrawPercentage).div(100); // 500 USDC

      expect(await amanaVault.connect(user1).withdraw(withdrawAmount1, await user1.getAddress(), await user1.getAddress())).to.changeTokenBalance(usdc, user1, withdrawAmount1);
      expect(await amanaVault.connect(user2).withdraw(withdrawAmount2, await user2.getAddress(), await user2.getAddress())).to.changeTokenBalance(usdc, user2, withdrawAmount2);

      const vaultAssets = await amanaVault.totalAssets();
      expect(vaultAssets).to.be.closeTo(0, errorMargin); // Vault should have no assets after withdrawals
    });
  });
});
