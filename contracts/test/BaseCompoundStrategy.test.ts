import { ethers, upgrades } from "hardhat";
import { expect } from "chai";
import { Signer } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers"
import { UpgradeableVault, IERC20, IERC4626, BaseCompoundStrategy } from "../typechain";

import { BASE_USDC_ADDRESS } from "../../frontend/src/constants/index";
import { COMPOUND_BASE_USDC_VAULT_ADDRESS } from "../../frontend/src/constants/index";
import { BASE_USDC_HOLDER_ADDRESS } from "../../frontend/src/constants/index";

describe("Vault and BaseCompoundStrategy", function () {
  let amanaVault: UpgradeableVault;
  let strategy: BaseCompoundStrategy;
  let usdc: IERC20;
  let moonwellVault: IERC4626;
  let owner: Signer;
  let user1: Signer;
  let user2: Signer;
  const errorMargin = 5;

  describe("BaseCompoundStrategy Investment", function () {
    async function setup() {
      // Get signers
      [owner, user1, user2] = await ethers.getSigners();

      // Forked USDC contract and Moonwell Pool
      usdc = await ethers.getContractAt("IERC20", BASE_USDC_ADDRESS);
      moonwellVault = await ethers.getContractAt("IERC4626", COMPOUND_BASE_USDC_VAULT_ADDRESS);

      // Deploy Vault contract
      const Vault = await ethers.getContractFactory("UpgradeableVault", owner);
      // Use the upgrades library to deploy the proxy
      amanaVault = await upgrades.deployProxy(
        Vault,
        ["AaveV3USDCVault", "AVU", BASE_USDC_ADDRESS, await owner.getAddress(), 1000],
        { initializer: "initialize" }
      );

      // Deploy BaseCompoundStrategy contract and set the amanaVault address
      const BaseCompoundStrategy = await ethers.getContractFactory("BaseCompoundStrategy", owner);
      strategy = await BaseCompoundStrategy.deploy("MoonwellUSDC", await amanaVault.getAddress(), BASE_USDC_ADDRESS, COMPOUND_BASE_USDC_VAULT_ADDRESS);

      // Set the strategy address in the amanaVault
      await amanaVault.setStrategy(await strategy.getAddress());

      // Impersonate USDC holder
      const usdcHolder = await ethers.getImpersonatedSigner(BASE_USDC_HOLDER_ADDRESS);

      // Set the initial balances for user1 and user2
      const depositAmount1 = ethers.parseUnits("1000", 6); // 1000 USDC for user1
      const depositAmount2 = ethers.parseUnits("500", 6); // 500 USDC for user2

      await usdc.connect(usdcHolder).transfer(await user1.getAddress(), depositAmount1);
      await usdc.connect(usdcHolder).transfer(await user2.getAddress(), depositAmount2);

      return { user1, user2, depositAmount1, depositAmount2, usdc, amanaVault };
    }
    it("should invest USDC into Moonwell via the strategy", async function () {
      const { user1, depositAmount1, usdc, amanaVault } = await loadFixture(setup);

      await usdc.connect(user1).approve(await amanaVault.getAddress(), depositAmount1);

      expect(await amanaVault.connect(user1).deposit(depositAmount1, await user1.getAddress())).to.changeTokenBalance(usdc, user1, depositAmount1);

      const mBaseUSDCBalance = await moonwellVault.balanceOf(await strategy.getAddress());

      expect(mBaseUSDCBalance).to.be.gt(0);
      expect(await amanaVault.totalAssets()).to.be.closeTo(depositAmount1, errorMargin); // Vault should have the same amount of assets
      expect(await amanaVault.balanceOf(await user1.getAddress())).to.equal(depositAmount1); // User should have 1000 vault shares
    });

    it("should withdraw USDC from Moonwell via the strategy", async function () {
      const { user1, depositAmount1, usdc, amanaVault } = await loadFixture(setup);

      await usdc.connect(user1).approve(await amanaVault.getAddress(), depositAmount1);
      await amanaVault.connect(user1).deposit(depositAmount1, await user1.getAddress())

      const withdrawAmount = depositAmount1;

      expect(await amanaVault.connect(user1).withdraw(withdrawAmount, await user1.getAddress(), await user1.getAddress())).to.changeTokenBalance(usdc, user1, withdrawAmount);

      let totalAssets = await amanaVault.totalAssets();
      let amanaUserBalance = await amanaVault.balanceOf(await user1.getAddress());

      expect(totalAssets).to.be.closeTo(0, errorMargin); // Vault should have close to 0 assets (small amount of interest)
      expect(amanaUserBalance).to.equal(0); // User should have 0 amanaVault shares
    });

    it("should handle deposits from two different users", async function () {
      const { user1, user2, depositAmount1, depositAmount2, usdc, amanaVault } = await loadFixture(setup);

      // User1 and User2 approve and deposit
      await usdc.connect(user1).approve(await amanaVault.getAddress(), depositAmount1);
      await usdc.connect(user2).approve(await amanaVault.getAddress(), depositAmount2);

      await amanaVault.connect(user1).deposit(depositAmount1, await user1.getAddress());
      await amanaVault.connect(user2).deposit(depositAmount2, await user2.getAddress());

      const totalAssets = await amanaVault.totalAssets();
      expect(totalAssets).to.be.closeTo(depositAmount1 + depositAmount2, errorMargin);

      const user1VaultBalance = await amanaVault.balanceOf(await user1.getAddress());
      const user2VaultBalance = await amanaVault.balanceOf(await user2.getAddress());

      expect(user1VaultBalance).to.equal(depositAmount1);
      expect(user2VaultBalance).to.be.closeTo(depositAmount2, errorMargin);
    });

    it("should handle withdrawals from two different users", async function () {
      const { user1, user2, depositAmount1, depositAmount2, usdc, amanaVault } = await loadFixture(setup);
      await usdc.connect(user1).approve(await amanaVault.getAddress(), depositAmount1);
      await usdc.connect(user2).approve(await amanaVault.getAddress(), depositAmount2);

      await amanaVault.connect(user1).deposit(depositAmount1, await user1.getAddress());
      await amanaVault.connect(user2).deposit(depositAmount2, await user2.getAddress());

      const withdrawAmount1 = depositAmount1; // 1000 USDC
      const withdrawAmount2 = depositAmount2; // 500 USDC

      expect(await amanaVault.connect(user1).withdraw(withdrawAmount1, await user1.getAddress(), await user1.getAddress())).to.changeTokenBalance(usdc, user1, withdrawAmount1);
      expect(await amanaVault.connect(user2).withdraw(withdrawAmount2, await user2.getAddress(), await user2.getAddress())).to.changeTokenBalance(usdc, user2, withdrawAmount2);

      const vaultAssets = await amanaVault.totalAssets();
      expect(vaultAssets).to.be.closeTo(0, errorMargin); // Vault should have no assets after withdrawals
    });
  });
});
