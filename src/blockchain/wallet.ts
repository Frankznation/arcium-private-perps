import { createWalletClient, http, type WalletClient, type Account } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { weiToEth } from '../utils/helpers';

let walletClient: WalletClient | null = null;
let account: Account | null = null;

/**
 * Initialize wallet client and account
 */
export function initializeWallet(): void {
  if (!config.privateKey) {
    throw new Error('PRIVATE_KEY environment variable is required');
  }

  account = privateKeyToAccount(config.privateKey as `0x${string}`);
  
  walletClient = createWalletClient({
    account,
    chain: base,
    transport: http(config.baseRpcUrl),
  });

  logger.info(`Wallet initialized: ${account.address}`);
}

/**
 * Get wallet client
 */
export function getWalletClient(): WalletClient {
  if (!walletClient) {
    initializeWallet();
  }
  return walletClient!;
}

/**
 * Get account
 */
export function getAccount(): Account {
  if (!account) {
    initializeWallet();
  }
  return account!;
}

/**
 * Get wallet address
 */
export function getWalletAddress(): `0x${string}` {
  return getAccount().address;
}

/**
 * Get ETH balance
 */
export async function getBalance(): Promise<bigint> {
  const { createPublicClient } = await import('viem');
  const publicClient = createPublicClient({
    chain: base,
    transport: http(config.baseRpcUrl),
  });

  const address = getWalletAddress();
  const balance = await publicClient.getBalance({ address });
  
  logger.debug(`Wallet balance: ${weiToEth(balance)} ETH`);
  return balance;
}

/**
 * Check if balance is sufficient
 */
export async function hasSufficientBalance(): Promise<boolean> {
  const balance = await getBalance();
  const minBalance = BigInt(Math.floor(config.minEthBalance * 1e18));
  return balance >= minBalance;
}
