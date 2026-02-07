import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Blockchain
  privateKey: process.env.PRIVATE_KEY || '',
  baseRpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
  nftContractAddress: process.env.NFT_CONTRACT_ADDRESS || '',

  // AI
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20240620',

  // Twitter
  twitter: {
    apiKey: process.env.TWITTER_API_KEY || '',
    apiSecret: process.env.TWITTER_API_SECRET || '',
    accessToken: process.env.TWITTER_ACCESS_TOKEN || '',
    accessSecret: process.env.TWITTER_ACCESS_SECRET || '',
    bearerToken: process.env.TWITTER_BEARER_TOKEN || '',
  },

  // Farcaster
  farcaster: {
    neynarApiKey: process.env.NEYNAR_API_KEY || '',
    signerUuid: process.env.FARCASTER_SIGNER_UUID || '',
  },

  // Database
  databaseUrl: process.env.DATABASE_URL || '',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseKey: process.env.SUPABASE_KEY || '',

  // Agent Config
  minEthBalance: parseFloat(process.env.MIN_ETH_BALANCE || '0.01'),
  loopIntervalMs: parseInt(process.env.LOOP_INTERVAL_MS || '180000', 10),
  maxPositionSize: parseFloat(process.env.MAX_POSITION_SIZE || '0.1'),
  stopLossBps: parseInt(process.env.STOP_LOSS_BPS || '1500', 10),
  takeProfitBps: parseInt(process.env.TAKE_PROFIT_BPS || '3000', 10),
  notableTradeThresholdBps: parseInt(process.env.NOTABLE_TRADE_THRESHOLD_BPS || '2000', 10),

  // Prediction Market
  predictionMarketApiUrl: process.env.PREDICTION_MARKET_API_URL || 'https://api.polymarket.com',
  limitlessApiBaseUrl: process.env.LIMITLESS_API_BASE_URL || 'https://api.limitless.exchange',
  limitlessApiKey: process.env.LIMITLESS_API_KEY || '',
  limitlessCategoryId: process.env.LIMITLESS_CATEGORY_ID || '',
  limitlessMarketsUrl: process.env.LIMITLESS_MARKETS_URL || '',
  limitlessApiKeyHeader: process.env.LIMITLESS_API_KEY_HEADER || 'X-API-Key',
  limitlessApiKeyPrefix: process.env.LIMITLESS_API_KEY_PREFIX || '',
  limitlessTradingEnabled: process.env.LIMITLESS_TRADING_ENABLED === 'true',
  limitlessOrderType: process.env.LIMITLESS_ORDER_TYPE || 'GTC',
  limitlessFeeRateBps: parseInt(process.env.LIMITLESS_FEE_RATE_BPS || '0', 10),
  limitlessUsdcAddress: process.env.LIMITLESS_USDC_ADDRESS || '',
  limitlessVenueExchangeAddress: process.env.LIMITLESS_VENUE_EXCHANGE_ADDRESS || '',
  limitlessOwnerId: (() => {
    const raw = process.env.LIMITLESS_OWNER_ID?.trim();
    if (!raw) return undefined;
    const num = parseInt(raw, 10);
    return Number.isNaN(num) ? undefined : num;
  })(),
  ethUsdPrice: parseFloat(process.env.ETH_USD_PRICE || '3000'),

  // Opinion Lab (opinion.trade) - alternative prediction market
  useOpinionLab: process.env.USE_OPINION_LAB === 'true',
  opinionApiBaseUrl: process.env.OPINION_API_BASE_URL || 'https://openapi.opinion.trade/openapi',
  opinionApiKey: process.env.OPINION_API_KEY || '',

  // Polymarket - Gamma (markets) + CLOB (prices + real trading)
  usePolymarket: process.env.USE_POLYMARKET === 'true',
  polymarketGammaUrl: process.env.POLYMARKET_GAMMA_URL || 'https://gamma-api.polymarket.com',
  polymarketClobUrl: process.env.POLYMARKET_CLOB_URL || 'https://clob.polymarket.com',
  polymarketTradingEnabled: process.env.POLYMARKET_TRADING_ENABLED === 'true',
  polymarketChainId: parseInt(process.env.POLYMARKET_CHAIN_ID || '137', 10),
  polymarketFunderAddress: process.env.POLYMARKET_FUNDER_ADDRESS?.trim() || '',
  polymarketSignatureType: parseInt(process.env.POLYMARKET_SIGNATURE_TYPE || '0', 10),
  polymarketApiKey: process.env.POLYMARKET_API_KEY || '',
  polymarketApiSecret: process.env.POLYMARKET_API_SECRET || '',
  polymarketApiPassphrase: process.env.POLYMARKET_API_PASSPHRASE || '',

  // PredictBase - prediction markets on Base (https://predictbase.app)
  usePredictBase: process.env.USE_PREDICTBASE === 'true',
  predictBaseApiUrl: process.env.PREDICTBASE_API_URL || 'https://api.predictbase.app',
  predictBaseApiKey: process.env.PREDICTBASE_API_KEY || '',

  // News
  newsFeeds: (process.env.NEWS_FEEDS || 'https://feeds.feedburner.com/CoinDesk')
    .split(',')
    .map((feed) => feed.trim())
    .filter(Boolean),

  // Tips
  tipRecipients: (process.env.TIP_RECIPIENTS || '')
    .split(',')
    .map((addr) => addr.trim())
    .filter(Boolean),
  tipAmountEth: parseFloat(process.env.TIP_AMOUNT_ETH || '0.0005'),
  tipMinBalanceEth: parseFloat(process.env.TIP_MIN_BALANCE_ETH || '0.02'),
  tipIntervalMs: parseInt(process.env.TIP_INTERVAL_MS || String(24 * 60 * 60 * 1000), 10),

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
  nodeEnv: process.env.NODE_ENV || 'production',

  // Feature flags
  disableMentions: process.env.DISABLE_MENTIONS === 'true',
  disableTips: process.env.DISABLE_TIPS === 'true',
  postLaunchAnnouncement: process.env.POST_LAUNCH_ANNOUNCEMENT === 'true',
};

// Validate required environment variables
const requiredVars = [
  'PRIVATE_KEY',
  'ANTHROPIC_API_KEY',
];

export function validateConfig(): void {
  const missing = requiredVars.filter(
    (varName) => !process.env[varName]
  );

  const hasDatabase =
    Boolean(process.env.DATABASE_URL) ||
    (Boolean(process.env.SUPABASE_URL) && Boolean(process.env.SUPABASE_KEY));

  if (!hasDatabase) {
    missing.push('DATABASE_URL or SUPABASE_URL + SUPABASE_KEY');
  }

  if (process.env.USE_PREDICTBASE === 'true') {
    if (!process.env.PREDICTBASE_API_KEY) missing.push('PREDICTBASE_API_KEY');
  }

  // Only require/warn Limitless vars when actually using Limitless for trading
  if (process.env.LIMITLESS_TRADING_ENABLED === 'true' && process.env.USE_POLYMARKET !== 'true' && process.env.USE_OPINION_LAB !== 'true' && process.env.USE_PREDICTBASE !== 'true') {
    if (!process.env.LIMITLESS_USDC_ADDRESS) missing.push('LIMITLESS_USDC_ADDRESS');
    const rawOwnerId = process.env.LIMITLESS_OWNER_ID?.trim();
    if (rawOwnerId) {
      const n = parseInt(rawOwnerId, 10);
      if (Number.isNaN(n)) {
        console.warn(
          `[config] LIMITLESS_OWNER_ID is set but not a valid number ("${rawOwnerId}"). ` +
          `Use a numeric profile ID only, e.g. LIMITLESS_OWNER_ID=12345`
        );
      }
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
}
