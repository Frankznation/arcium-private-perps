import { logger } from '../utils/logger';
import type { PredictionMarket, MarketData } from './types';
import { config } from '../config/env';
import { retry } from '../utils/helpers';
import { fetchOpinionMarkets } from './opinion';
import { fetchPolymarketMarkets } from './polymarket';
import { fetchPredictBaseMarkets } from './predictbase';

/** Limitless slug format: lowercase, hyphens, digits; no spaces/emojis/special chars */
function isValidLimitlessSlug(s: string): boolean {
  const t = s.trim();
  if (t.length < 5) return false;
  if (/^\d+$/.test(t)) return false;
  if (/\s/.test(t)) return false; // no spaces
  if (/[^a-z0-9-]/.test(t.toLowerCase())) return false; // only a-z, 0-9, hyphen (check lowercased)
  return true;
}

/**
 * Fetch prediction market data
 * This is a placeholder - integrate with actual prediction market APIs
 * Options: Polymarket API, Kalshi API, or onchain contracts
 */
export async function fetchMarkets(): Promise<MarketData> {
  if (config.usePredictBase) {
    logger.debug('Fetching prediction market data (PredictBase)...');
    return fetchPredictBaseMarkets();
  }
  if (config.usePolymarket) {
    logger.debug('Fetching prediction market data (Polymarket)...');
    return fetchPolymarketMarkets();
  }
  if (config.useOpinionLab) {
    logger.debug('Fetching prediction market data (Opinion Lab)...');
    return fetchOpinionMarkets();
  }

  logger.debug('Fetching prediction market data (Limitless)...');

  const baseUrl = config.limitlessApiBaseUrl.replace(/\/$/, '');
  const endpoint = config.limitlessCategoryId
    ? `/markets/active/${config.limitlessCategoryId}`
    : '/markets/active';
  const urlOverride = config.limitlessMarketsUrl;

  try {
    const data = await retry(async () => {
      const url = urlOverride || `${baseUrl}${endpoint}`;

      const fetchJson = async (targetUrl: string) => {
        const res = await fetch(targetUrl, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...(config.limitlessApiKey
              ? {
                  [config.limitlessApiKeyHeader]:
                    config.limitlessApiKeyPrefix
                      ? `${config.limitlessApiKeyPrefix} ${config.limitlessApiKey}`
                      : config.limitlessApiKey,
                }
              : {}),
          },
        });

        const text = await res.text();

        if (!res.ok) {
          throw new Error(`Limitless API error: ${res.status} ${text.slice(0, 200)} (url: ${targetUrl})`);
        }

        try {
          return JSON.parse(text);
        } catch (error) {
          throw new Error(`Limitless API returned non-JSON: ${text.slice(0, 200)} (url: ${targetUrl})`);
        }
      };

      try {
        return await fetchJson(url);
      } catch (firstError) {
        // Try alternate path: if base has no api-v1, try with it; else try without
        const base = config.limitlessApiBaseUrl.replace(/\/$/, '');
        const altUrl = url.includes('/api-v1')
          ? `${base.replace(/\/api-v1$/, '')}${endpoint}`
          : `${base}/api-v1${endpoint}`;
        if (altUrl !== url) {
          try {
            return await fetchJson(altUrl);
          } catch {
            throw firstError;
          }
        }
        throw firstError;
      }
    });

    const payload = data as any;
    const rawMarkets = Array.isArray(payload) ? payload : payload?.markets || payload?.data || payload?.groups || [];

    // Flatten: if items are groups with nested "markets", expand so each tradeable market has its own slug.
    const flatRows: any[] = [];
    for (const item of rawMarkets) {
      if (!item) continue;
      const nested = item.markets || item.children;
      if (Array.isArray(nested) && nested.length > 0) {
        for (const sub of nested) {
          if (sub && (typeof sub.slug === 'string' || typeof sub.id === 'string')) {
            flatRows.push({
              slug: sub.slug || sub.id,
              title: sub.title || sub.name || sub.question || item.title || item.name,
              description: sub.description || item.description,
              yesPriceBps: sub.yesPriceBps ?? sub.yesPrice ?? item.yesPriceBps ?? item.yesPrice,
              noPriceBps: sub.noPriceBps ?? sub.noPrice ?? item.noPriceBps ?? item.noPrice,
              volume24h: sub.volume24h ?? sub.volume ?? item.volume24h ?? item.volume ?? 0,
              liquidity: sub.liquidity ?? item.liquidity ?? 0,
              category: sub.category ?? item.category ?? 'general',
            });
          }
        }
      } else {
        const rawSlug = item.slug ?? item.marketSlug ?? item.id;
        if (rawSlug != null && typeof rawSlug === 'string') {
          flatRows.push({
            slug: rawSlug,
            title: item.title || item.name || item.question,
          description: item.description || item.details,
          yesPriceBps: item.yesPriceBps ?? item.yesPrice,
          noPriceBps: item.noPriceBps ?? item.noPrice,
          volume24h: item.volume24h ?? item.volume ?? 0,
          liquidity: item.liquidity ?? 0,
          category: item.category ?? item.categoryId ?? 'general',
          });
        }
      }
    }

    // If flattening produced nothing, use original top-level items that have slug (backward compatible)
    const toFilter = flatRows.length > 0 ? flatRows : rawMarkets;
    const tradableMarkets = toFilter.filter((m: any) => {
      const raw = m.slug ?? m.id;
      const slug = raw != null ? String(raw).trim() : '';
      if (!slug) return false;
      if (!isValidLimitlessSlug(slug)) return false;
      return true;
    });

    if (tradableMarkets.length === 0 && toFilter.length > 0) {
      const sample = toFilter[0];
      logger.warn(
        'No markets had valid Limitless slug format (need lowercase-hyphens, no spaces). ' +
        'Sample keys: ' + Object.keys(sample).join(', ') +
        (sample.slug != null ? ` | slug: ${String(sample.slug).slice(0, 60)}` : '') +
        (sample.id != null ? ` | id: ${String(sample.id).slice(0, 60)}` : '')
      );
    }

    const markets: PredictionMarket[] = tradableMarkets.map((m: any) => {
      const slug = String(m.slug || m.id).trim().toLowerCase();
      return {
        id: slug,
        name: String(m.title || m.name || 'Unknown Market').slice(0, 200),
        description: String(m.description || ''),
        yesPrice: Math.round(Number(m.yesPriceBps ?? m.yesPrice ?? 5000)),
        noPrice: Math.round(Number(m.noPriceBps ?? m.noPrice ?? 10000 - Number(m.yesPriceBps ?? m.yesPrice ?? 5000))),
        volume24h: Number(m.volume24h || m.volume || 0),
        liquidity: Number(m.liquidity || 0),
        category: String(m.category || 'general'),
      };
    });

    return {
      markets,
      timestamp: Date.now(),
    };
  } catch (error) {
    logger.error(`Failed to fetch markets: ${error}`);
    throw error;
  }
}

/**
 * Get market by ID
 */
export async function getMarketById(marketId: string): Promise<PredictionMarket | null> {
  const data = await fetchMarkets();
  return data.markets.find((m) => m.id === marketId) || null;
}

/**
 * Get trending markets (high volume)
 */
export async function getTrendingMarkets(limit: number = 10): Promise<PredictionMarket[]> {
  const data = await fetchMarkets();
  return data.markets
    .sort((a, b) => b.volume24h - a.volume24h)
    .slice(0, limit);
}
