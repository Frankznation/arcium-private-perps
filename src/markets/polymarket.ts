/**
 * Polymarket integration: Gamma API (markets) + CLOB API (prices + real trading).
 * Docs: https://docs.polymarket.com/developers/gamma-markets-api/fetch-markets-guide
 *       https://docs.polymarket.com/developers/CLOB/orders/create-order
 */

import { Wallet } from '@ethersproject/wallet';
import { ClobClient, OrderType, Side } from '@polymarket/clob-client';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { retry } from '../utils/helpers';
import type { PredictionMarket, MarketData } from './types';

const tokenIdsByMarketId = new Map<string, { yesTokenId: string; noTokenId: string }>();

let clobClientInstance: ClobClient | null = null;
let clobCredsPromise: Promise<{ key: string; secret: string; passphrase: string }> | null = null;

/**
 * Fetch active markets from Polymarket Gamma API.
 * Uses /events for market discovery; flattens to binary markets with token ids.
 */
export async function fetchPolymarketMarkets(): Promise<MarketData> {
  const baseUrl = config.polymarketGammaUrl.replace(/\/$/, '');
  const url = `${baseUrl}/events?order=volume24hr&ascending=false&closed=false&limit=50`;

  const events = await retry(async () => {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Polymarket Gamma error: ${res.status} ${text.slice(0, 200)}`);
    }
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Polymarket Gamma returned non-JSON`);
    }
  });

  const list = Array.isArray(events) ? events : [];
  tokenIdsByMarketId.clear();

  const markets: PredictionMarket[] = [];
  for (const event of list) {
    const eventMarkets = event.markets || [];
    for (const m of eventMarkets) {
      if (!m.conditionId || m.closed) continue;
      const clobTokenIds = (m.clobTokenIds || '').trim();
      if (!clobTokenIds) continue;
      const tokens = clobTokenIds.split(',').map((t: string) => t.trim()).filter(Boolean);
      if (tokens.length < 2) continue;
      const yesTokenId = tokens[0];
      const noTokenId = tokens[1];
      const marketId = String(m.conditionId || m.id || m.slug);
      tokenIdsByMarketId.set(marketId, { yesTokenId, noTokenId });

      const outcomePrices = (m.outcomePrices || '').split(',').map((p: string) => parseFloat(p.trim())).filter((n: number) => !Number.isNaN(n));
      const yesBps = outcomePrices.length >= 1 ? Math.round(Math.max(0, Math.min(1, outcomePrices[0])) * 10000) : 5000;
      const noBps = outcomePrices.length >= 2 ? Math.round(Math.max(0, Math.min(1, outcomePrices[1])) * 10000) : 10000 - yesBps;

      markets.push({
        id: marketId,
        name: String(m.question || event.title || 'Unknown Market').slice(0, 200),
        description: String(m.description || ''),
        yesPrice: yesBps,
        noPrice: noBps,
        volume24h: Number(m.volume24hr ?? m.volume ?? 0),
        liquidity: Number(m.liquidityNum ?? m.liquidity ?? 0),
        category: String(event.category || 'polymarket'),
      });
    }
  }

  if (markets.length === 0 && list.length > 0) {
    const marketsUrl = `${baseUrl}/markets?closed=false&limit=50`;
    const marketsRes = await fetch(marketsUrl, { method: 'GET', headers: { Accept: 'application/json' } });
    if (marketsRes.ok) {
      try {
        const marketsList = await marketsRes.json();
        const arr = Array.isArray(marketsList) ? marketsList : [];
        for (const m of arr) {
          if (!m.conditionId || m.closed) continue;
          const clobTokenIds = (m.clobTokenIds || '').trim();
          if (!clobTokenIds) continue;
          const tokens = clobTokenIds.split(',').map((t: string) => t.trim()).filter(Boolean);
          if (tokens.length < 2) continue;
          const marketId = String(m.conditionId);
          tokenIdsByMarketId.set(marketId, { yesTokenId: tokens[0], noTokenId: tokens[1] });
          const outcomePrices = (m.outcomePrices || '').split(',').map((p: string) => parseFloat(p.trim())).filter((n: number) => !Number.isNaN(n));
          const yesBps = outcomePrices.length >= 1 ? Math.round(Math.max(0, Math.min(1, outcomePrices[0])) * 10000) : 5000;
          markets.push({
            id: marketId,
            name: String(m.question || 'Unknown').slice(0, 200),
            description: String(m.description || ''),
            yesPrice: yesBps,
            noPrice: 10000 - yesBps,
            volume24h: Number(m.volume24hr ?? 0),
            liquidity: 0,
            category: 'polymarket',
          });
        }
      } catch {
        // ignore
      }
    }
  }

  logger.info(`Fetched ${markets.length} markets from Polymarket`);
  return { markets, timestamp: Date.now() };
}

/**
 * Get current price for a Polymarket outcome (YES or NO) from CLOB.
 * Returns price in basis points (0–10000). CLOB returns 0–1 for binary.
 */
export async function getPolymarketMarketPrice(marketId: string, position: 'YES' | 'NO'): Promise<number> {
  const tokens = tokenIdsByMarketId.get(marketId);
  if (!tokens) {
    logger.warn(`Polymarket: no token IDs for market ${marketId}, using 5000 bps`);
    return 5000;
  }
  const tokenId = position === 'YES' ? tokens.yesTokenId : tokens.noTokenId;
  if (!tokenId) return 5000;

  const baseUrl = config.polymarketClobUrl.replace(/\/$/, '');
  const url = `${baseUrl}/price?token_id=${encodeURIComponent(tokenId)}&side=BUY`;

  const data = await retry(async () => {
    const res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Polymarket CLOB error: ${res.status} ${text.slice(0, 200)}`);
    }
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Polymarket CLOB returned non-JSON`);
    }
  });

  const priceStr = (data as { price?: string })?.price;
  const price = parseFloat(priceStr ?? '0.5');
  const p = price > 1 ? price / 100 : price;
  const bps = Math.round(Math.max(0, Math.min(1, p)) * 10000);
  return bps;
}

/**
 * Get or create Polymarket CLOB client (L1 + L2 auth). Caches client and API creds.
 * Requires PRIVATE_KEY; optionally POLYMARKET_API_KEY/SECRET/PASSPHRASE to skip L1 derive.
 */
async function getClobClient(): Promise<ClobClient> {
  if (clobClientInstance) return clobClientInstance;
  if (!config.privateKey) {
    throw new Error('PRIVATE_KEY required for Polymarket real trading');
  }
  const host = config.polymarketClobUrl.replace(/\/$/, '');
  const chainId = config.polymarketChainId;
  const signer = new Wallet(config.privateKey);
  const funder = config.polymarketFunderAddress || signer.address;
  const signatureType = config.polymarketSignatureType;

  let creds: { key: string; secret: string; passphrase: string };
  if (config.polymarketApiKey && config.polymarketApiSecret && config.polymarketApiPassphrase) {
    creds = {
      key: config.polymarketApiKey,
      secret: config.polymarketApiSecret,
      passphrase: config.polymarketApiPassphrase,
    };
  } else {
    if (!clobCredsPromise) {
      clobCredsPromise = (async () => {
        const tempClient = new ClobClient(host, chainId, signer);
        const apiCreds = await tempClient.createOrDeriveApiKey();
        return {
          key: apiCreds.key,
          secret: apiCreds.secret,
          passphrase: apiCreds.passphrase,
        };
      })();
    }
    creds = await clobCredsPromise;
  }

  clobClientInstance = new ClobClient(host, chainId, signer, creds, signatureType, funder);
  logger.info('Polymarket CLOB client initialized (real trading)');
  return clobClientInstance;
}

export interface PolymarketOrderResult {
  orderId?: string;
  orderHashes?: string[];
  success?: boolean;
  errorMsg?: string;
}

/**
 * Place a real BUY order on Polymarket CLOB.
 * @param marketId conditionId (from our market list)
 * @param position YES or NO
 * @param priceBps price in basis points 0–10000
 * @param sizeUsd size in USD (dollars)
 */
export async function createPolymarketOrder(
  marketId: string,
  position: 'YES' | 'NO',
  priceBps: number,
  sizeUsd: number
): Promise<PolymarketOrderResult> {
  const tokens = tokenIdsByMarketId.get(marketId);
  if (!tokens) {
    throw new Error(`Polymarket: no token IDs for market ${marketId}`);
  }
  const tokenId = position === 'YES' ? tokens.yesTokenId : tokens.noTokenId;
  const price = Math.max(0.01, Math.min(0.99, priceBps / 10000));

  const client = await getClobClient();
  const resp = await client.createAndPostOrder(
    {
      tokenID: tokenId,
      price,
      side: Side.BUY,
      size: sizeUsd,
    },
    undefined,
    OrderType.GTC
  );
  return resp as PolymarketOrderResult;
}

/**
 * Place a real SELL order on Polymarket CLOB.
 * @param marketId conditionId
 * @param position YES or NO
 * @param priceBps price in basis points
 * @param sizeShares size in outcome shares (tokens)
 */
export async function createPolymarketSellOrder(
  marketId: string,
  position: 'YES' | 'NO',
  priceBps: number,
  sizeShares: number
): Promise<PolymarketOrderResult> {
  const tokens = tokenIdsByMarketId.get(marketId);
  if (!tokens) {
    throw new Error(`Polymarket: no token IDs for market ${marketId}`);
  }
  const tokenId = position === 'YES' ? tokens.yesTokenId : tokens.noTokenId;
  const price = Math.max(0.01, Math.min(0.99, priceBps / 10000));

  const client = await getClobClient();
  const resp = await client.createAndPostOrder(
    {
      tokenID: tokenId,
      price,
      side: Side.SELL,
      size: sizeShares,
    },
    undefined,
    OrderType.GTC
  );
  return resp as PolymarketOrderResult;
}
