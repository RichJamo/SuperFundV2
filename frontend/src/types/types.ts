import { ThirdwebClient } from "thirdweb";
import { ChainOptions } from "thirdweb/chains";
export interface Vault {
  id: string;
  chain: string;
  protocol: string;
  name: string;
  totalAssets: string;
  apy7d: string;
  userBalance?: string;
}

export interface NewUserModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
  onAddUser: (username: string, walletAddress: string) => void;
  username?: string; 
  isLoading?: boolean;
  onChangeUsername?: (username: string) => void; 
  onCreateAccount?: () => void; 
}

export interface Domain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
}
export interface Rate {
  id: string;
  type: string;
  rate: string;
}

export interface VaultData {
  id: string;
  inputToken: {
    symbol: string;
    decimals: number;
  };
  name: string;
  rates: Rate[];
  totalValueLockedUSD: string;
}

export interface FormattedVault {
  id: string;
  name: string;
  symbol: string;
  chain: string;
  protocol: string;
  totalAssets: string;
  previewPPS: string;
  pricePerVaultShare: string;
  apy7d: string;
  userBalance: string;
}
export interface User {
  walletAddress: string;
  managerAddress: string;
}

export type UserMap = { [username: string]: User };

export interface TransactionResult {
  readonly transactionHash: `0x${string}`;
  client: ThirdwebClient;
  chain: Readonly<ChainOptions & { rpc: string }>;
  maxBlocksWaitTime?: number;
}