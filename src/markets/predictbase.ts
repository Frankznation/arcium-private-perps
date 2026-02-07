/**
 * PredictBase integration (https://predictbase.app) - prediction markets on Base.
 * API: https://predictbase.gitbook.io/docs/developer/endpoints
 * Uses USDC on Base; auth via x-api-key for orders.
 */

import { config } from '../config/env';
import { logger } from '../utils/logger';
import { retry } from '../utils/helpers';
import { getWalletAddress } from '../blockchain/wallet';
import type { PredictionMarket, MarketData } from './types';

const priceCacheByMarketId = new Map<string, { yesPrice: number; noPrice: number }>();
const nameToMarketId = new Map<string, string>();

function parsePrice1e6(s: string | number): number {
  const n = typeof s === 'string' ? parseInt(s, 10) : s;
  return Number.isNaN(n) ? 0.5 : Math.max(0, Math.min(1, n / 1e6));
}

/**
 * Fetch active markets from PredictBase.
 * GET /get_active_markets - no auth, returns optionPrices in 1e6.
 */
export async function fetchPredictBaseMarkets(): Promise<MarketData> {
  const baseUrl = config.predictBaseApiUrl.replace(/\/$/, '');
  const url = `${baseUrl}/get_active_markets`;

  const list = await retry(async () => {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`PredictBase error: ${res.status} ${text.slice(0, 200)}`);
    }
    try {
      return JSON.parse(text);
    } catch {
      throw new Error('PredictBase returned non-JSON');
    }
  });

  const arr = Array.isArray(list) ? list : [];
  priceCacheByMarketId.clear();
  nameToMarketId.clear();

  const markets: PredictionMarket[] = [];
  for (const m of arr) {
    if (m.status !== 0 && m.status !== '0') continue;
    const id = String(m.id ?? '');
    if (!id) continue;
    const optionPrices = Array.isArray(m.optionPrices) ? m.optionPrices : [];
    const yesRaw = optionPrices[0] ?? 500000;
    const noRaw = optionPrices[1] ?? 500000;
    const yesP = parsePrice1e6(yesRaw);
    const noP = parsePrice1e6(noRaw);
    const yesBps = Math.round(yesP * 10000);
    const noBps = Math.round(noP * 10000);
    priceCacheByMarketId.set(id, { yesPrice: yesBps, noPrice: noBps });
    const name = String(m.question || 'Unknown Market').slice(0, 200).trim();
    if (name) nameToMarketId.set(name, id);

    const volume24h = typeof m.volume === 'string' ? parseFloat(m.volume) || 0 : Number(m.volume ?? 0);

    markets.push({
      id,
      name,
      description: String(m.details || ''),
      yesPrice: yesBps,
      noPrice: noBps,
      volume24h,
      liquidity: 0,
      category: Array.isArray(m.categories) ? m.categories[0] ?? 'predictbase' : 'predictbase',
    });
  }

  logger.info(`Fetched ${markets.length} markets from PredictBase`);
  return { markets, timestamp: Date.now() };
}

/**
 * Get current price for a PredictBase outcome (YES=optionIndex 0, NO=optionIndex 1).
 * Uses last-fetched market data; resolves by numeric id or by name. Returns basis points.
 */
export function getPredictBaseMarketPrice(marketId: string, position: 'YES' | 'NO'): number {
  const resolvedId = priceCacheByMarketId.has(marketId)
    ? marketId
    : (nameToMarketId.get(marketId?.trim() ?? '') ?? marketId);
  const cached = priceCacheByMarketId.get(resolvedId);
  if (cached) {
    return position === 'YES' ? cached.yesPrice : cached.noPrice;
  }
  logger.warn(`PredictBase: no cached price for market ${marketId}, using 5000 bps`);
  return 5000;
}

/**
 * Place a BUY order on PredictBase.
 * API: POST /create-order, x-api-key, body order.price in USD 0–1, order.qty in shares.
 * We pass amountUsd and derive qty = amountUsd / price.
 */
export async function createPredictBaseOrder(
  marketId: string,
  position: 'YES' | 'NO',
  priceBps: number,
  amountUsd: number
): Promise<{ orderId?: string; success?: boolean; error?: string }> {
  const apiKey = config.predictBaseApiKey;
  if (!apiKey) {
    throw new Error('PREDICTBASE_API_KEY required for real PredictBase trading');
  }
  const price = Math.max(0.01, Math.min(0.99, priceBps / 10000));
  const qty = Math.max(0.01, amountUsd / price);
  const optionIndex = position === 'YES' ? 0 : 1;
  const userId = getWalletAddress();

  const baseUrl = config.predictBaseApiUrl.replace(/\/$/, '');
  const url = `${baseUrl}/create-order`;

  const body = {
    kind: 'NEW_ORDER',
    order: {
      type: 'LIMIT',
      side: 'BUY',
      marketId,
      optionIndex,
      qty: Math.round(qty * 100) / 100,
      price: Math.round(price * 100) / 100,
      userId,
      timeInForce: 'GTC',
      receivedAt: Date.now(),
    },
    meta: {
      clientOrderId: `crab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      originalQty: Math.round(qty * 100) / 100,
    },
  };

  const res = await retry(async () => {
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(body),
    });
    const text = await r.text();
    if (!r.ok) {
      throw new Error(`PredictBase create-order: ${r.status} ${text.slice(0, 300)}`);
    }
    try {
      return JSON.parse(text);
    } catch {
      return { success: true };
    }
  });

  const result = res as { orderId?: string; success?: boolean; error?: string };
  logger.info(`PredictBase BUY order placed: market ${marketId} ${position} qty ${qty}`);
  return result;
}

/**
 * Place a SELL order on PredictBase.
 * qty = shares to sell (we pass sizeShares).
 */
export async function createPredictBaseSellOrder(
  marketId: string,
  position: 'YES' | 'NO',
  priceBps: number,
  sizeShares: number
): Promise<{ orderId?: string; success?: boolean; error?: string }> {
  const apiKey = config.predictBaseApiKey;
  if (!apiKey) {
    throw new Error('PREDICTBASE_API_KEY required for real PredictBase trading');
  }
  const price = Math.max(0.01, Math.min(0.99, priceBps / 10000));
  const optionIndex = position === 'YES' ? 0 : 1;
  const userId = getWalletAddress();

  const baseUrl = config.predictBaseApiUrl.replace(/\/$/, '');
  const url = `${baseUrl}/create-order`;

  const body = {
    kind: 'NEW_ORDER',
    order: {
      type: 'LIMIT',
      side: 'SELL',
      marketId,
      optionIndex,
      qty: Math.round(sizeShares * 100) / 100,
      price: Math.round(price * 100) / 100,
      userId,
      timeInForce: 'GTC',
      receivedAt: Date.now(),
    },
    meta: {
      clientOrderId: `crab-sell-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      originalQty: Math.round(sizeShares * 100) / 100,
    },
  };

  const res = await retry(async () => {
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(body),
    });
    const text = await r.text();
    if (!r.ok) {
      const err = text.includes('Insufficient available shares')
        ? { insufficientShares: true as const, available: 0 }
        : null;
      if (err) return err;
      throw new Error(`PredictBase create-order SELL: ${r.status} ${text.slice(0, 300)}`);
    }
    try {
      return JSON.parse(text);
    } catch {
      return { success: true };
    }
  });

  const result = res as { orderId?: string; success?: boolean; error?: string; insufficientShares?: boolean; available?: number };
  if (result.insufficientShares) {
    logger.warn(`PredictBase: no shares to sell (available: ${result.available ?? 0}). Position may be from another source or already closed. Marking closed in DB.`);
    return result;
  }
  logger.info(`PredictBase SELL order placed: market ${marketId} ${position} qty ${sizeShares}`);
  return result;
}
