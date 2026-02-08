import { formatUnits, parseUnits } from 'viem';

/**
 * Convert wei to ETH
 */
export function weiToEth(wei: bigint): number {
  return parseFloat(formatUnits(wei, 18));
}

/**
 * Convert ETH to wei
 */
export function ethToWei(eth: number): bigint {
  return parseUnits(eth.toString(), 18);
}

/**
 * Calculate basis points (1 bps = 0.01%)
 */
export function calculateBps(entryPrice: number, exitPrice: number): number {
  if (entryPrice === 0) return 0;
  return Math.round(((exitPrice - entryPrice) / entryPrice) * 10000);
}

/**
 * Format ETH amount for display
 */
export function formatEth(amount: number, decimals: number = 4): string {
  return `${amount.toFixed(decimals)} ETH`;
}

/**
 * Format basis points for display
 */
export function formatBps(bps: number): string {
  const percent = (bps / 100).toFixed(2);
  const sign = bps >= 0 ? '+' : '';
  return `${sign}${percent}%`;
}

/** Base tx hash: 0x + 64 hex chars. Order IDs from PredictBase/Polymarket are not valid. */
export function isValidBasescanTxHash(txHash: string): boolean {
  return /^0x[0-9a-fA-F]{64}$/.test((txHash || '').trim());
}

/**
 * Generate Basescan transaction URL (only for real on-chain tx hashes)
 */
export function getBasescanUrl(txHash: string): string {
  return `https://basescan.org/tx/${txHash}`;
}

/**
 * Return Basescan tx URL if value is a real tx hash; otherwise return null.
 * Use this for posts so we don't link order IDs to Basescan (which would error).
 */
export function getBasescanTxLinkIfValid(txHash: string): string | null {
  return isValidBasescanTxHash(txHash) ? getBasescanUrl(txHash) : null;
}

/**
 * Generate Basescan address URL
 */
export function getBasescanAddressUrl(address: string): string {
  return `https://basescan.org/address/${address}`;
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error | unknown;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        await sleep(delay * Math.pow(2, i));
      }
    }
  }
  
  throw lastError;
}

/**
 * Truncate string to max length
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}
