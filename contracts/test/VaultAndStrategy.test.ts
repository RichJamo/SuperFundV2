import { ethers } from "hardhat";
import { expect } from "chai";
import { Contract, Signer } from "ethers";
import { IERC20 } from "../typechain-types";

describe("Vault and Strategy", function () {
  let vault: Contract;
  let strategy: Contract;
  let usdc: IERC20;
  let aavePool: Contract;
  let aaveToken: IERC20;
  let owner: Signer;
  let user: Signer;

  // Addresses for USDC and Aave Pool on Arbitrum
  const ARBITRUM_USDC_ADDRESS = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
  const AAVE_POOL_ADDRESS = "0x794a61358D6845594F94dc1DB02A252b5b4814aD";
  const AAVE_RECEIPT_TOKEN_ADDRESS = "0x724dc807b04555b71ed48a6896b6F41593b8C637";
  const USDC_HOLDER_ADDRESS = "0xf89d7b9c864f589bbF53a82105107622B35EaA40";

  beforeEach(async () => {
    // Get signers
    [owner, user] = await ethers.getSigners();

    // Forked USDC contract and Aave Pool
    usdc = await ethers.getContractAt("IERC20", ARBITRUM_USDC_ADDRESS);
    aavePool = await ethers.getContractAt("IAavePool", AAVE_POOL_ADDRESS);
    aaveToken = await ethers.getContractAt("IERC20", AAVE_RECEIPT_TOKEN_ADDRESS);

    // Deploy Vault contract
    const Vault = await ethers.getContractFactory("GenericVault", owner);
    vault = await Vault.deploy("GenericVault", "GV", ARBITRUM_USDC_ADDRESS);

    // Deploy Strategy contract and set the vault address
    const Strategy = await ethers.getContractFactory("Strategy", owner);
    strategy = await Strategy.deploy(vault.address);

    // Set the strategy address in the vault
    await vault.setStrategy(strategy.address);
  });

  describe("Strategy Investment", function () {
    it("should invest USDC into Aave via the strategy", async function () {
      const depositAmount = ethers.utils.parseUnits("1000", 6); // 1000 USDC

      // Impersonate USDC holder
      const usdcHolder = await ethers.getImpersonatedSigner(USDC_HOLDER_ADDRESS);
      console.log("userBalanceUSDC", await usdc.balanceOf(await user.getAddress()));

      // Transfer USDC to user and approve vault
      await usdc.connect(usdcHolder).transfer(await user.getAddress(), depositAmount);
      await usdc.connect(user).approve(vault.address, depositAmount);

      // Deposit USDC into the vault
      await vault.connect(user).deposit(depositAmount, await user.getAddress());

      // Check that the strategy has invested in Aave
      const aArbUSDCBalance = await aaveToken.balanceOf(strategy.address);

      expect(aArbUSDCBalance).to.equal(depositAmount); // Should have 1000 aArbUSDC tokens after investment
      expect(await vault.totalAssets()).to.equal(depositAmount); // Vault should have the same amount of assets
      expect(await usdc.balanceOf(await user.getAddress())).to.equal(0); // User should have 0 USDC after deposit
      expect(await vault.balanceOf(await user.getAddress())).to.equal(depositAmount); // User should have 1000 vault shares
    });

    it("should withdraw USDC from Aave via the strategy", async function () {
      const depositAmount = ethers.utils.parseUnits("1000", 6); // 1000 USDC

      // Impersonate USDC holder and approve vault
      const usdcHolder = await ethers.getImpersonatedSigner(USDC_HOLDER_ADDRESS); // USDC holder address
      await usdc.connect(usdcHolder).transfer(await user.getAddress(), depositAmount);
      await usdc.connect(user).approve(vault.address, depositAmount);

      // Deposit USDC into the vault
      await vault.connect(user).deposit(depositAmount, await user.getAddress());
      // Check that the strategy has invested in Aave
      let aArbUSDCBalance = await aaveToken.balanceOf(strategy.address);
      // Withdraw USDC from the strategy
      await vault.connect(user).withdraw(depositAmount, await user.getAddress(), await user.getAddress());
      aArbUSDCBalance = await aaveToken.balanceOf(strategy.address);

      // Check that USDC is back in the vault
      const userBalance = await usdc.balanceOf(user.getAddress());
      expect(aArbUSDCBalance).to.be.closeTo(0, 5); // Should have 0 aArbUSDC tokens after investment
      expect(await vault.totalAssets()).to.be.closeTo(0, 5); // Vault should have close to 0 assets (small amount of interest)
      expect(await vault.balanceOf(await user.getAddress())).to.equal(0); // User should have 0 vault shares
      expect(userBalance).to.equal(depositAmount);
    });
  });
});
