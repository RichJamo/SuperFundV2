import { VaultData } from "../types";

export const OPTIMISM_USDC_CONTRACT_ADDRESS = "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85";
export const ARB_USDC_CONTRACT_ADDRESS = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
export const BASE_USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

export const ARB_AAVE_POOL_ADDRESS = "0x794a61358D6845594F94dc1DB02A252b5b4814aD";
export const ARB_AAVE_RECEIPT_TOKEN_ADDRESS = "0x724dc807b04555b71ed48a6896b6F41593b8C637";
export const ARB_USDC_HOLDER_ADDRESS = "0xf89d7b9c864f589bbF53a82105107622B35EaA40"

export const BASE_AAVE_POOL_ADDRESS = "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5";
export const BASE_AAVE_RECEIPT_TOKEN_ADDRESS = "0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB";
export const BASE_USDC_HOLDER_ADDRESS = "0xF977814e90dA44bFA03b6295A0616a897441aceC"
export const MOONWELL_BASE_USDC_VAULT_ADDRESS = "0xc1256Ae5FF1cf2719D4937adb3bbCCab2E00A2Ca";

export const VAULT_DATA: VaultData[] = [
  {
    id: "0x4AD5E74EC722aAf52Bf4D1ACfE0A3EC516746A4d", // Generic Amana Aave Vault on Base
    inputToken: {
      symbol: "USDC",
      decimals: 6,
      address: BASE_USDC_ADDRESS,
    },
    protocol: {
      name: "Aave",
      network: "Base",
    },
    name: "AaveV3 USDC",
  },
  {
    id: "0x383a344C32c0787BAfea507b1D19097Ad049D7eD", // Generic Amana Moonwell Vault on Base
    inputToken: {
      symbol: "USDC",
      decimals: 6,
      address: BASE_USDC_ADDRESS,
    },
    protocol: {
      name: "Moonwell",
      network: "Base",
    },
    name: "Moonwell Flagship USDC",
  },
  {
    id: "TBC", // Generic Amana Compound Vault on Base
    inputToken: {
      symbol: "USDC",
      decimals: 6,
      address: BASE_USDC_ADDRESS,
    },
    protocol: {
      name: "Compound",
      network: "Base",
    },
    name: "Compound USDC",
  },
];



// Other constants can be added here
