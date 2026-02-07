/**
 * Opinion Lab (opinion.trade) Open API integration.
 * Docs: https://docs.opinion.trade/developer-guide/opinion-open-api/overview
 * - Market data: GET /market, GET /token/latest-price
 * - Trading: use CLOB SDK (Python) or mock; Open API is read-only.
 */

import { config } from '../config/env';
import { logger } from '../utils/logger';
import { retry } from '../utils/helpers';
import type { PredictionMarket, MarketData } from './types';

const tokenIdsByMarketId = new Map<string, { yesTokenId: string; noTokenId: string }>();

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (config.opinionApiKey) {
    headers['apikey'] = config.opinionApiKey;
  }
  return headers;
}

/**
 * Fetch active markets from Opinion Open API.
 * Maps to our PredictionMarket format; token IDs stored for getOpinionMarketPrice.
 */
export async function fetchOpinionMarkets(): Promise<MarketData> {
  const baseUrl = config.opinionApiBaseUrl.replace(/\/$/, '');
  const url = `${baseUrl}/market?status=activated&sortBy=5&limit=20`;

  const data = await retry(async () => {
    const res = await fetch(url, { method: 'GET', headers: getHeaders() });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Opinion API error: ${res.status} ${text.slice(0, 200)} (url: ${url})`);
    }
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Opinion API returned non-JSON: ${text.slice(0, 200)}`);
    }
  });

  const payload = data as { code?: number; msg?: string; result?: { total?: number; list?: any[] } };
  if (payload.code !== 0 && payload.code !== undefined) {
    throw new Error(`Opinion API error: ${payload.msg || 'unknown'} (code: ${payload.code})`);
  }

  const list = payload.result?.list ?? [];
  tokenIdsByMarketId.clear();

  const markets: PredictionMarket[] = list
    .filter((m: any) => m.marketId != null && (m.yesTokenId || m.noTokenId))
    .map((m: any) => {
      const marketId = String(m.marketId);
      const yesTokenId = String(m.yesTokenId ?? '').trim();
      const noTokenId = String(m.noTokenId ?? '').trim();
      if (yesTokenId) tokenIdsByMarketId.set(marketId, { yesTokenId, noTokenId });

      return {
        id: marketId,
        name: String(m.marketTitle || m.name || 'Unknown Market').slice(0, 200),
        description: String(m.rules || ''),
        yesPrice: 5000,
        noPrice: 5000,
        volume24h: Number(m.volume24h ?? m.volume ?? 0),
        liquidity: 0,
        category: 'opinion',
      };
    });

  logger.info(`Fetched ${markets.length} markets from Opinion Lab`);
  return { markets, timestamp: Date.now() };
}

/**
 * Get latest price for a market outcome (YES or NO) from Opinion.
 * Returns price in basis points (0–10000).
 */
export async function getOpinionMarketPrice(marketId: string, position: 'YES' | 'NO'): Promise<number> {
  const tokens = tokenIdsByMarketId.get(marketId);
  if (!tokens) {
    logger.warn(`Opinion: no token IDs for market ${marketId}, using 5000 bps`);
    return 5000;
  }
  const tokenId = position === 'YES' ? tokens.yesTokenId : tokens.noTokenId;
  if (!tokenId) {
    return 5000;
  }

  const baseUrl = config.opinionApiBaseUrl.replace(/\/$/, '');
  const url = `${baseUrl}/token/latest-price?token_id=${encodeURIComponent(tokenId)}`;

  const data = await retry(async () => {
    const res = await fetch(url, { method: 'GET', headers: getHeaders() });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Opinion API error: ${res.status} ${text.slice(0, 200)}`);
    }
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Opinion API returned non-JSON`);
    }
  });

  const payload = data as { code?: number; result?: { price?: string | number } };
  if (payload.code !== 0 && payload.code !== undefined) {
    logger.warn(`Opinion latest-price error for ${marketId}, using 5000 bps`);
    return 5000;
  }
  const price = Number(payload.result?.price ?? 0.5);
  const bps = Math.round(Math.max(0, Math.min(1, price)) * 10000);
  return bps;
}
