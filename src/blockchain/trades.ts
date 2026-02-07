import { type Hash } from 'viem';
import { getBalance } from './wallet';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { weiToEth, ethToWei, calculateBps } from '../utils/helpers';
import { createLimitlessOrder } from '../markets/limitless';
import { fetchMarkets } from '../markets/fetcher';

export interface TradeParams {
  marketId: string;
  marketName: string;
  position: 'YES' | 'NO';
  amountEth: number;
  expectedPrice: number; // Price in basis points (0-10000)
}

export interface TradeResult {
  txHash: Hash;
  actualPrice: number;
  amountOut: bigint;
  timestamp: number;
  /** Resolved Limitless slug; use this as market_id in DB so lookups work */
  resolvedMarketId?: string;
}

/**
 * Execute a trade on a prediction market or DEX
 * Note: This is a simplified implementation. In production, integrate with actual prediction market contracts
 */
export async function executeTrade(params: TradeParams): Promise<TradeResult> {
  const balance = await getBalance();
  const amountWei = ethToWei(params.amountEth);

  // Validate balance
  if (balance < amountWei) {
    throw new Error(`Insufficient balance. Required: ${params.amountEth} ETH, Available: ${weiToEth(balance)} ETH`);
  }

  // Validate position size
  const portfolioValue = weiToEth(balance);
  const maxPosition = portfolioValue * config.maxPositionSize;
  if (params.amountEth > maxPosition) {
    throw new Error(`Position size exceeds maximum (${config.maxPositionSize * 100}% of portfolio)`);
  }

  logger.info(`Executing trade: ${params.marketName} - ${params.position} - ${params.amountEth} ETH`);

  try {
    if (!config.limitlessTradingEnabled) {
      const mockTxHash = `0x${Math.random().toString(16).slice(2).padStart(64, '0')}` as Hash;
      logger.warn('Limitless trading disabled - using mock trade execution');
      return {
        txHash: mockTxHash,
        actualPrice: params.expectedPrice,
        amountOut: amountWei,
        timestamp: Date.now(),
        resolvedMarketId: params.marketId,
      };
    }

    const amountUsd = params.amountEth * config.ethUsdPrice;

    // Resolve Limitless slug: prefer match by id (slug), then by exact name
    let marketSlug = params.marketId;
    try {
      const data = await fetchMarkets();
      const byId = data.markets.find((m) => m.id === params.marketId);
      const byName = data.markets.find((m) => m.name === params.marketName || m.name?.trim() === params.marketName?.trim());
      if (byId) {
        marketSlug = byId.id;
      } else if (byName) {
        marketSlug = byName.id;
      }
      logger.info(`Resolved slug for "${params.marketName}": ${marketSlug}`);
    } catch (lookupError) {
      logger.warn(`Failed to resolve Limitless slug from markets, falling back to marketId: ${lookupError}`);
    }
    const result = await createLimitlessOrder({
      marketSlug,
      position: params.position,
      side: 'BUY',
      amountUsd,
      priceBps: params.expectedPrice,
    });

    const txHash = (result.orderId || `0x${Math.random().toString(16).slice(2).padStart(64, '0')}`) as Hash;

    return {
      txHash,
      actualPrice: params.expectedPrice,
      amountOut: amountWei,
      timestamp: Date.now(),
      resolvedMarketId: marketSlug,
    };
  } catch (error) {
    logger.error(`Trade execution failed: ${error}`);
    throw error;
  }
}

/**
 * Close a position (sell/exit)
 */
export async function closePosition(
  marketName: string,
  position: 'YES' | 'NO',
  entryPrice: number,
  currentPrice: number,
  amountUsd: number
): Promise<TradeResult> {
  const pnlBps = calculateBps(entryPrice, currentPrice);
  
  logger.info(`Closing position: ${marketName} - Entry: ${entryPrice}, Exit: ${currentPrice}, P&L: ${pnlBps} bps`);

  // Check stop loss
  if (pnlBps <= -config.stopLossBps) {
    logger.warn(`Stop loss triggered: ${pnlBps} bps`);
  }

  // Check take profit
  if (pnlBps >= config.takeProfitBps) {
    logger.info(`Take profit triggered: ${pnlBps} bps`);
  }

  try {
    if (!config.limitlessTradingEnabled) {
      const mockTxHash = `0x${Math.random().toString(16).slice(2).padStart(64, '0')}` as Hash;
      logger.warn('Limitless trading disabled - using mock close execution');
      return {
        txHash: mockTxHash,
        actualPrice: currentPrice,
        amountOut: ethToWei(0.1),
        timestamp: Date.now(),
      };
    }

    // Resolve Limitless slug by name or id (market_id in DB is slug)
    let marketSlug = marketName;
    try {
      const data = await fetchMarkets();
      const byName = data.markets.find((m) => m.name === marketName || m.name?.trim() === marketName?.trim());
      const byId = data.markets.find((m) => m.id === marketName);
      if (byName) marketSlug = byName.id;
      else if (byId) marketSlug = byId.id;
    } catch (lookupError) {
      logger.warn(`Failed to resolve Limitless slug from markets (close), falling back to marketName: ${lookupError}`);
    }

    const result = await createLimitlessOrder({
      marketSlug,
      position,
      side: 'SELL',
      amountUsd,
      priceBps: currentPrice,
    });

    const txHash = (result.orderId || `0x${Math.random().toString(16).slice(2).padStart(64, '0')}`) as Hash;

    return {
      txHash,
      actualPrice: currentPrice,
      amountOut: ethToWei(0.1),
      timestamp: Date.now(),
    };
  } catch (error) {
    logger.error(`Close position failed: ${error}`);
    throw error;
  }
}

/**
 * Get current price for a market
 * Placeholder - integrate with actual market data source
 */
export async function getMarketPrice(
  marketId: string,
  position: 'YES' | 'NO'
): Promise<number> {
  const data = await fetchMarkets();
  const market = data.markets.find((m) => m.id === marketId);
  if (!market) {
    return Math.floor(Math.random() * 10000);
  }
  return position === 'YES' ? market.yesPrice : market.noPrice;
}
