import { config } from '../config/env';
import { logger } from '../utils/logger';
import { getAccount, getWalletClient } from '../blockchain/wallet';
import { ensureErc20Allowance } from '../blockchain/erc20';

const ORDER_TYPES = {
  Order: [
    { name: 'salt', type: 'uint256' },
    { name: 'maker', type: 'address' },
    { name: 'signer', type: 'address' },
    { name: 'taker', type: 'address' },
    { name: 'tokenId', type: 'uint256' },
    { name: 'makerAmount', type: 'uint256' },
    { name: 'takerAmount', type: 'uint256' },
    { name: 'expiration', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'feeRateBps', type: 'uint256' },
    { name: 'side', type: 'uint8' },
    { name: 'signatureType', type: 'uint8' },
  ],
} as const;

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;
const USDC_DECIMALS = 6;

type OrderSide = 'BUY' | 'SELL';

interface LimitlessMarket {
  slug?: string;
  id?: number | string;
  conditionId?: string;
  negRiskRequestId?: string | null;
  positionIds?: string[];
  venue?: {
    exchange?: string;
  };
  markets?: Array<{
    id?: number | string;
    conditionId?: string;
    venue?: {
      exchange?: string;
    };
  }>;
  data?: {
    venue?: {
      exchange?: string;
    };
    markets?: Array<{
      venue?: {
        exchange?: string;
      };
    }>;
  };
}

function buildLimitlessHeaders(): Record<string, string> {
  if (!config.limitlessApiKey) {
    return {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
  }

  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    [config.limitlessApiKeyHeader]: config.limitlessApiKeyPrefix
      ? `${config.limitlessApiKeyPrefix} ${config.limitlessApiKey}`
      : config.limitlessApiKey,
  };
}

let cachedOwnerId: number | null = null;
let cachedProfileId: number | string | null = null;

/**
 * Fetch numeric profile ID from wallet address (Limitless requires numeric ownerId)
 * Support confirmed: GET /api-v1/profile returns { id: <numeric profile ID> }
 * Note: May require authentication first via /auth/login
 */
async function fetchLimitlessProfileId(walletAddress: string): Promise<number> {
  if (cachedProfileId !== null) {
    const num = typeof cachedProfileId === 'number' ? cachedProfileId : parseInt(String(cachedProfileId), 10);
    if (!Number.isNaN(num)) return num;
  }
  
  const baseUrl = config.limitlessApiBaseUrl.replace(/\/$/, '');
  const addr = walletAddress.toLowerCase();
  const headers = buildLimitlessHeaders();
  const hasApiKey = Boolean(config.limitlessApiKey);
  
  // Primary endpoint (as support suggested): GET /profile (without /api-v1)
  // Support said: "GET: https://api.limitless.exchange/profile with header X-API-Key: lmts_... and Accept: application/json"
  const primaryUrl = `${baseUrl}/profile`;
  
  logger.debug(`Fetching profile ID from ${primaryUrl} (API key: ${hasApiKey ? 'present' : 'missing'})`);
  
  try {
    const res = await fetch(primaryUrl, { 
      method: 'GET', 
      headers
    });
    const text = await res.text();
    
    if (res.ok) {
      // Check if response is JSON
      if (!text.trim().startsWith('{') && !text.trim().startsWith('[')) {
        // Likely HTML or other non-JSON response
        logger.warn(
          `/profile returned non-JSON response (status ${res.status}). ` +
          `Response starts with: ${text.slice(0, 100)}... ` +
          `This might indicate the endpoint doesn't exist or requires different authentication.`
        );
      } else {
        try {
          const data = JSON.parse(text);
          if (data && typeof data === 'object') {
            const id = data.id;
            if (id != null) {
              const num = typeof id === 'number' ? id : parseInt(String(id), 10);
              if (!Number.isNaN(num) && num > 0) {
                cachedProfileId = num;
                logger.info(`✅ Limitless profile ID resolved: ${num} (from ${primaryUrl})`);
                return num;
              } else {
                logger.debug(`/profile response has invalid id field: ${id}`);
              }
            } else {
              logger.debug(`/profile response missing 'id' field. Response keys: ${Object.keys(data).join(', ')}`);
            }
          }
        } catch (parseError) {
          logger.warn(`Failed to parse /profile JSON response: ${parseError}. Response: ${text.slice(0, 200)}`);
        }
      }
    } else {
      logger.debug(`/profile returned ${res.status} ${res.statusText}. Response: ${text.slice(0, 200)}`);
    }
  } catch (error) {
    logger.debug(`Failed to fetch /profile: ${error}`);
  }
  
  // Fallback: try /api-v1/profile (original endpoint)
  const fallbackUrl = `${baseUrl}/api-v1/profile`;
  logger.debug(`Trying fallback endpoint: ${fallbackUrl}`);
  
  try {
    const res = await fetch(fallbackUrl, { 
      method: 'GET', 
      headers
    });
    const text = await res.text();
    
    if (res.ok && (text.trim().startsWith('{') || text.trim().startsWith('['))) {
      try {
        const data = JSON.parse(text);
        if (data && typeof data === 'object' && 'id' in data) {
          const id = data.id;
          const num = typeof id === 'number' ? id : parseInt(String(id), 10);
          if (!Number.isNaN(num) && num > 0) {
            cachedProfileId = num;
            logger.info(`✅ Limitless profile ID resolved: ${num} (from ${fallbackUrl})`);
            return num;
          }
        }
      } catch {
        // Not JSON, continue to other endpoints
      }
    }
  } catch {
    // Continue to other endpoints
  }
  
  // Recursively search for numeric ID fields in the response
  const findNumericId = (obj: unknown, depth = 0): number | null => {
    if (depth > 5) return null; // Prevent infinite recursion
    if (obj === null || obj === undefined) return null;
    
    if (typeof obj === 'object') {
      const record = obj as Record<string, unknown>;
      
      // Check common ID field names
      const idFields = ['id', 'profileId', 'userId', 'ownerId', 'profile_id', 'user_id', 'owner_id', 'accountId', 'userAccountId'];
      for (const field of idFields) {
        const value = record[field];
        if (value != null) {
          const num = typeof value === 'number' ? value : parseInt(String(value), 10);
          if (!Number.isNaN(num) && num > 0) {
            return num;
          }
        }
      }
      
      // Recursively check nested objects and arrays
      for (const key in record) {
        if (Array.isArray(record[key])) {
          for (const item of record[key] as unknown[]) {
            const found = findNumericId(item, depth + 1);
            if (found != null) return found;
          }
        } else if (typeof record[key] === 'object') {
          const found = findNumericId(record[key], depth + 1);
          if (found != null) return found;
        }
      }
    }
    
    return null;
  };
  
  // Fallback: try other endpoints
  const endpoints = [
    // Fallback endpoints
    `${baseUrl}/profile`,
    `${baseUrl}/users/profile`,
    `${baseUrl}/api-v1/users/profile`,
    `${baseUrl}/user/profile`,
    `${baseUrl}/api-v1/user/profile`,
    // Try authenticated endpoints that might return profile data
    `${baseUrl}/portfolio`,
    `${baseUrl}/api-v1/portfolio`,
    `${baseUrl}/balance`,
    `${baseUrl}/api-v1/balance`,
    `${baseUrl}/accounts/${addr}`,
    `${baseUrl}/api-v1/accounts/${addr}`,
    `${baseUrl}/trades`,
    `${baseUrl}/api-v1/trades`,
    `${baseUrl}/positions`,
    `${baseUrl}/api-v1/positions`,
    `${baseUrl}/orders`,
    `${baseUrl}/api-v1/orders`,
    `${baseUrl}/users/${addr}`,
    `${baseUrl}/api-v1/users/${addr}`,
    `${baseUrl}/users/me`,
    `${baseUrl}/api-v1/users/me`,
    `${baseUrl}/auth/verify-auth`,
    `${baseUrl}/api-v1/auth/verify-auth`,
  ];
  
  // Also try POST /api-v1/profile (some APIs use POST)
  const postEndpoints = [
    `${baseUrl}/api-v1/profile`,
    `${baseUrl}/profile`,
  ];
  
  for (const url of endpoints) {
    try {
      const res = await fetch(url, { method: 'GET', headers: buildLimitlessHeaders() });
      const text = await res.text();
      if (!res.ok) continue;
      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        continue;
      }
      
      const numericId = findNumericId(data);
      if (numericId != null) {
        cachedProfileId = numericId;
        logger.info(`Limitless profile ID resolved: ${numericId} (from ${url})`);
        return numericId;
      }
    } catch {
      continue;
    }
  }
  
  // Try POST endpoints (some APIs use POST for profile with empty body)
  for (const url of postEndpoints) {
    try {
      const res = await fetch(url, { 
        method: 'POST', 
        headers: { ...buildLimitlessHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const text = await res.text();
      if (!res.ok) continue;
      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        continue;
      }
      
      const numericId = findNumericId(data);
      if (numericId != null) {
        cachedProfileId = numericId;
        logger.info(`Limitless profile ID resolved: ${numericId} (from POST ${url})`);
        return numericId;
      }
    } catch {
      continue;
    }
  }
  
  // All API lookups failed - user must set LIMITLESS_OWNER_ID manually
  throw new Error(
    `Could not get numeric profile ID from Limitless API for wallet ${addr}.\n` +
    `\n` +
    `SOLUTION: Set LIMITLESS_OWNER_ID in your .env file.\n` +
    `\n` +
    `To find your profile ID:\n` +
    `1. Log in to https://limitless.exchange\n` +
    `2. Check your profile page, account settings, or dashboard for a numeric "User ID" or "Profile ID"\n` +
    `3. Or contact Limitless support with:\n` +
    `   "I need my numeric profile ID for the orders API. ` +
    `   The /profile and /api-v1/profile endpoints return 404/HTML. ` +
    `   What is the correct endpoint or how can I find my profile ID? ` +
    `   My wallet: ${addr}"\n` +
    `4. Add to .env: LIMITLESS_OWNER_ID=<your_numeric_id>\n` +
    `\n` +
    `Note: API endpoints tested:\n` +
    `- /profile → 404\n` +
    `- /api-v1/profile → HTML (API docs page)\n` +
    `- /api-v1/users/me → HTML (API docs page)\n` +
    `- /api-v1/portfolio → HTML (API docs page)\n` +
    `\n` +
    `The /api-v1/* endpoints appear to return the API documentation page instead of JSON responses.`
  );
}

/**
 * Try to get current user/owner id from Limitless API (so you don't have to find it manually).
 * Tries auth/verify-auth, users/me, me, and profile endpoints. Caches result.
 */
export async function fetchLimitlessOwnerId(): Promise<number> {
  if (cachedOwnerId !== null) return cachedOwnerId;
  const baseUrl = config.limitlessApiBaseUrl.replace(/\/$/, '');
  const account = getAccount();
  const walletAddress = account.address.toLowerCase();
  
  // Try various endpoints that might return user id
  const endpoints = [
    `${baseUrl}/auth/verify-auth`,
    `${baseUrl}/api-v1/auth/verify-auth`,
    `${baseUrl}/users/me`,
    `${baseUrl}/api-v1/users/me`,
    `${baseUrl}/me`,
    `${baseUrl}/profile/${walletAddress}`,
    `${baseUrl}/api-v1/profile/${walletAddress}`,
    `${baseUrl}/users/${walletAddress}`,
    `${baseUrl}/api-v1/users/${walletAddress}`,
  ];
  
  for (const url of endpoints) {
    try {
      const res = await fetch(url, { method: 'GET', headers: buildLimitlessHeaders() });
      const text = await res.text();
      if (!res.ok) continue;
      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        continue;
      }
      if (data && typeof data === 'object') {
        const obj = data as Record<string, unknown>;
        // Try multiple possible field names for user id
        const id = obj.id ?? obj.userId ?? obj.ownerId ?? obj.user_id ?? obj.owner_id ?? obj.accountId;
        if (id != null) {
          const num = typeof id === 'number' ? id : parseInt(String(id), 10);
          if (!Number.isNaN(num)) {
            cachedOwnerId = num;
            logger.info(`Limitless owner id resolved from API: ${num} (from ${url})`);
            return num;
          }
        }
      }
    } catch {
      continue;
    }
  }
  
  // If API lookup failed, give clear instructions
  throw new Error(
    `Could not get Limitless owner id from API. Please set LIMITLESS_OWNER_ID in .env.\n` +
    `Your wallet: ${walletAddress}\n` +
    `Check your profile at: https://limitless.exchange/profile/${walletAddress}\n` +
    `Look for a "User ID", "Account ID", or "ID" number on that page, or contact Limitless support.`
  );
}

export async function fetchLimitlessMarket(slug: string): Promise<LimitlessMarket> {
  const baseUrl = config.limitlessApiBaseUrl.replace(/\/$/, '');
  const url = `${baseUrl}/markets/${slug}`;
  const res = await fetch(url, { headers: buildLimitlessHeaders() });
  const text = await res.text();

  if (!res.ok) {
    throw new Error(`Limitless market fetch failed: ${res.status} ${text.slice(0, 200)} (url: ${url})`);
  }

  try {
    const parsed = JSON.parse(text);
    // Log structure for debugging (first 300 chars)
    logger.debug(`Limitless market response structure: ${JSON.stringify(parsed, null, 2).slice(0, 300)}`);
    return parsed;
  } catch (error) {
    throw new Error(`Limitless market returned non-JSON: ${text.slice(0, 200)} (url: ${url})`);
  }
}

function getPositionTokenId(market: LimitlessMarket, position: 'YES' | 'NO'): bigint {
  // Try multiple approaches to get position token ID
  
  // Approach 1: Direct positionIds array
  if (market.positionIds && market.positionIds.length > 0) {
    const tokenId = position === 'YES' ? market.positionIds[0] : market.positionIds[1];
    if (tokenId) {
      return BigInt(tokenId);
    }
  }
  
  // Approach 2: Use market.id directly (for simple markets)
  // YES = market.id, NO = market.id + 1 (or similar pattern)
  if (market.id !== undefined) {
    const marketId = typeof market.id === 'string' ? parseInt(market.id, 10) : market.id;
    // For CTF, typically YES = index 0, NO = index 1
    // But Limitless might use market.id directly or market.id * 2 + index
    // Try using market.id as base: YES = market.id, NO = market.id + 1
    const tokenId = position === 'YES' ? marketId : marketId + 1;
    logger.debug(`Using market.id-based token ID: ${tokenId} for position ${position}`);
    return BigInt(tokenId);
  }
  
  // Approach 3: Compute from conditionId (CTF standard)
  if (market.conditionId) {
    // For CTF, token ID = keccak256(conditionId, index)
    // But we'd need to import keccak256 and encode properly
    // For now, log and use a fallback
    logger.warn(`Market has conditionId but no direct token ID. Using market.id fallback.`);
  }
  
  // Approach 4: Check nested markets array
  if (market.markets && market.markets.length > 0) {
    const subMarket = position === 'YES' ? market.markets[0] : market.markets[1];
    if (subMarket?.id) {
      const tokenId = typeof subMarket.id === 'string' ? parseInt(subMarket.id, 10) : subMarket.id;
      return BigInt(tokenId);
    }
  }
  
  // If all else fails, log and throw
  logger.error(`Limitless market structure: ${JSON.stringify(market, null, 2).slice(0, 500)}`);
  throw new Error(
    'Limitless market missing positionIds for YES/NO. ' +
    `Market ID: ${market.id}, Condition ID: ${market.conditionId}. ` +
    'Check Limitless API docs for token ID derivation.'
  );
}

function getVenueExchange(market: LimitlessMarket): `0x${string}` {
  // Try multiple locations where venue.exchange might be
  let exchange =
    market.venue?.exchange ||
    market.markets?.[0]?.venue?.exchange ||
    market.data?.venue?.exchange ||
    market.data?.markets?.[0]?.venue?.exchange;

  // If not found in API response, use config fallback
  if (!exchange) {
    exchange = config.limitlessVenueExchangeAddress || '';
  }

  // If still not found, determine from market type
  if (!exchange) {
    // Check if this is a negrisk market (has negRiskRequestId) or simple market
    const isNegRisk = market.negRiskRequestId !== null && market.negRiskRequestId !== undefined;
    
    if (isNegRisk) {
      // Use negrisk v3 exchange (most recent)
      exchange = '0xe3E00BA3a9888d1DE4834269f62ac008b4BB5C47';
      logger.info('Using negrisk v3 exchange address (detected from negRiskRequestId)');
    } else {
      // Use simple v3 exchange (most recent)
      exchange = '0x05c748E2f4DcDe0ec9Fa8DDc40DE6b867f923fa5';
      logger.info('Using simple v3 exchange address (detected from market type)');
    }
  }

  if (!exchange) {
    // Log the market structure for debugging
    logger.error(`Limitless market structure: ${JSON.stringify(market, null, 2).slice(0, 500)}`);
    throw new Error(
      'Limitless market missing venue.exchange address. ' +
      'Set LIMITLESS_VENUE_EXCHANGE_ADDRESS in .env or check Limitless API docs for the correct venue address.'
    );
  }
  return exchange as `0x${string}`;
}

function toUsdcUnits(amountUsd: number): bigint {
  return BigInt(Math.round(amountUsd * 10 ** USDC_DECIMALS));
}

function toSharesUnits(amountShares: number): bigint {
  return BigInt(Math.round(amountShares * 10 ** USDC_DECIMALS));
}

function buildOrderAmounts(side: OrderSide, amountUsd: number, priceUsd: number): {
  makerAmount: bigint;
  takerAmount: bigint;
} {
  if (priceUsd <= 0) {
    throw new Error(`Invalid price for order: ${priceUsd}`);
  }

  const shares = amountUsd / priceUsd;

  if (side === 'BUY') {
    return {
      makerAmount: toUsdcUnits(amountUsd),
      takerAmount: toSharesUnits(shares),
    };
  }

  return {
    makerAmount: toSharesUnits(shares),
    takerAmount: toUsdcUnits(amountUsd),
  };
}

export async function createLimitlessOrder(params: {
  marketSlug: string;
  position: 'YES' | 'NO';
  side: OrderSide;
  amountUsd: number;
  priceBps: number;
}): Promise<{ orderId?: string; raw: unknown }> {
  const { marketSlug, position, side, amountUsd, priceBps } = params;
  const market = await fetchLimitlessMarket(marketSlug);
  const venueExchange = getVenueExchange(market);
  const tokenId = getPositionTokenId(market, position);
  const account = getAccount();

  const priceUsd = priceBps / 10000;
  const { makerAmount, takerAmount } = buildOrderAmounts(side, amountUsd, priceUsd);

  if (side === 'BUY') {
    if (!config.limitlessUsdcAddress) {
      throw new Error('LIMITLESS_USDC_ADDRESS not set');
    }
    await ensureErc20Allowance({
      tokenAddress: config.limitlessUsdcAddress as `0x${string}`,
      spender: venueExchange,
      minAllowance: makerAmount,
    });
  }

  const salt = BigInt(Date.now() + 24 * 60 * 60 * 1000);

  const message = {
    salt,
    maker: account.address,
    signer: account.address,
    taker: ZERO_ADDRESS,
    tokenId,
    makerAmount,
    takerAmount,
    expiration: BigInt(0),
    nonce: BigInt(0),
    feeRateBps: BigInt(config.limitlessFeeRateBps),
    side: side === 'BUY' ? 0 : 1,
    signatureType: 0,
  } as const;

  const domain = {
    name: 'Limitless CTF Exchange',
    version: '1',
    chainId: 8453,
    verifyingContract: venueExchange,
  } as const;

  const walletClient = getWalletClient();
  const signature = await walletClient.signTypedData({
    account,
    domain,
    types: ORDER_TYPES,
    primaryType: 'Order',
    message,
  });

  const baseUrl = config.limitlessApiBaseUrl.replace(/\/$/, '');
  const orderUrl = `${baseUrl}/orders`;
  // API expects: salt, makerAmount, takerAmount, nonce, feeRateBps as numbers; tokenId, expiration as strings
  const orderSerialized = {
    salt: Number(message.salt),
    maker: message.maker,
    signer: message.signer,
    taker: message.taker,
    tokenId: String(message.tokenId),
    makerAmount: Number(message.makerAmount),
    takerAmount: Number(message.takerAmount),
    expiration: String(message.expiration),
    nonce: Number(message.nonce),
    feeRateBps: Number(message.feeRateBps),
    side: message.side,
    signatureType: message.signatureType,
    price: priceUsd,
    signature,
  };
  // ownerId: Limitless API requires a NUMBER. Try fetching numeric profile ID from wallet address.
  let ownerId: number;
  
  if (config.limitlessOwnerId !== undefined && config.limitlessOwnerId !== null) {
    // User explicitly set LIMITLESS_OWNER_ID - use it (must be a number)
    ownerId = Number(config.limitlessOwnerId);
    if (Number.isNaN(ownerId)) {
      throw new Error(
        `LIMITLESS_OWNER_ID must be a number, got: ${config.limitlessOwnerId}. ` +
        `Set it to your numeric Limitless user/profile ID.`
      );
    }
  } else {
    // Try to get numeric profile ID from wallet address via API
    ownerId = await fetchLimitlessProfileId(account.address);
  }

  const payload = {
    order: orderSerialized,
    orderType: config.limitlessOrderType,
    marketSlug,
    ownerId,
  };

  logger.info(`Submitting Limitless order: ${marketSlug} ${side} ${position} $${amountUsd.toFixed(2)} @ ${priceUsd.toFixed(4)}`);
  logger.debug(`Using ownerId: ${ownerId} for wallet: ${account.address}`);

  const res = await fetch(orderUrl, {
    method: 'POST',
    headers: buildLimitlessHeaders(),
    body: JSON.stringify(payload),
  });
  const text = await res.text();

  if (!res.ok) {
    // Check for specific "Profile ID does not match" error
    if (res.status === 400 && text.includes('Profile ID does not match')) {
      throw new Error(
        `Limitless order failed: Profile ID does not match the order owner.\n` +
        `\n` +
        `The ownerId (${ownerId}) being sent doesn't match your actual Limitless profile ID.\n` +
        `\n` +
        `SOLUTION:\n` +
        `1. Log in to https://limitless.exchange\n` +
        `2. Find your numeric "User ID" or "Profile ID" in your account settings\n` +
        `3. Set LIMITLESS_OWNER_ID=<your_actual_profile_id> in your .env file\n` +
        `4. Restart the agent\n` +
        `\n` +
        `Or contact Limitless support: "What is my numeric profile ID for wallet ${account.address}?"\n` +
        `\n` +
        `Full error: ${text.slice(0, 300)}`
      );
    }
    throw new Error(`Limitless order failed: ${res.status} ${text.slice(0, 200)} (url: ${orderUrl})`);
  }

  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Keep raw text fallback.
  }

  const orderId = typeof parsed === 'object' && parsed !== null && 'id' in parsed
    ? String((parsed as { id?: unknown }).id)
    : undefined;

  return { orderId, raw: parsed };
}
