# Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Copy `.env.example` to `.env` and fill in all required values:

```bash
cp .env.example .env
```

**Required variables (Farcaster-only setup):**
- `PRIVATE_KEY`: Your wallet private key (the agent will use this wallet)
- `ANTHROPIC_API_KEY`: Get from https://console.anthropic.com/
- `NEYNAR_API_KEY`: Get from https://neynar.com/ (for Farcaster)
- `SUPABASE_URL` and `SUPABASE_KEY`: Get from https://supabase.com/

**Optional variables (recommended):**
- `ANTHROPIC_MODEL`: Exact model ID from Anthropic dashboard
- `LIMITLESS_API_BASE_URL`: Limitless API base URL (e.g. https://api.limitless.exchange)
- `LIMITLESS_API_KEY`: Limitless API key
- `LIMITLESS_CATEGORY_ID`: Optional category filter for markets
- `LIMITLESS_MARKETS_URL`: Override full markets URL if docs require it
- `LIMITLESS_API_KEY_HEADER`: API key header name (e.g. X-API-KEY)
- `LIMITLESS_API_KEY_PREFIX`: Prefix for key (e.g. Bearer) or empty
- **Real Limitless trading:** set `LIMITLESS_TRADING_ENABLED=true`, `LIMITLESS_USDC_ADDRESS` (Base USDC), and **`LIMITLESS_OWNER_ID`** (your Limitless user id number — find it in the Limitless app/dashboard or API; required for placing orders).
- `NEWS_FEEDS`: Comma-separated RSS URLs for headlines
- `TIP_RECIPIENTS`: Comma-separated Base addresses to tip
- `TIP_AMOUNT_ETH`: ETH to tip each time
- `DISABLE_MENTIONS`: Set to `true` to skip mention replies
- `DISABLE_TIPS`: Set to `true` to disable onchain tips

### 3. Set Up Database

1. Create a Supabase project at https://supabase.com/
2. Go to SQL Editor
3. Run the SQL from `database/schema.sql`
4. Copy your project URL and anon key to `.env`

### 4. Deploy Smart Contract

#### Option A: Using Hardhat (Recommended)

```bash
# Install Hardhat dependencies (already in package.json)
npm install

# Compile contract
npm run compile

# Deploy to Base mainnet
npm run deploy:hardhat
```

#### Option B: Using Foundry

```bash
# Install Foundry (if not installed)
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Build
forge build

# Deploy
forge create contracts/CrabTradeNFT.sol:CrabTradeNFT \
  --rpc-url $BASE_RPC_URL \
  --private-key $PRIVATE_KEY \
  --constructor-args $(cast wallet address $PRIVATE_KEY)
```

After deployment, update `.env`:
```
NFT_CONTRACT_ADDRESS=0x...
```

### 5. Fund Your Wallet

Send ETH to your wallet address (the one corresponding to `PRIVATE_KEY`) on Base mainnet.

Minimum recommended: 0.1 ETH
- 0.05 ETH for trading
- 0.05 ETH for gas fees

### 6. Set Up Social Media Accounts

#### Farcaster

1. Create a Farcaster account (use Warpcast or another client)
2. Get a signer UUID from Neynar
3. Add `NEYNAR_API_KEY` and `FARCASTER_SIGNER_UUID` to `.env`

### 7. Test Locally

```bash
# Run in development mode
npm run dev
```

Monitor the logs to ensure everything is working.

### 8. Deploy to Production

#### Railway

1. Connect your GitHub repo to Railway
2. Add all environment variables in Railway dashboard
3. Set build command: `npm run build`
4. Set start command: `npm start`
5. Deploy!

#### Render

1. Create a new Web Service
2. Connect your GitHub repo
3. Set build command: `npm run build`
4. Set start command: `npm start`
5. Add environment variables
6. Deploy!

## Important Notes

### Prediction Market Integration

The current implementation includes placeholder code for prediction market integration. To make it fully functional, you need to:

1. **Choose a prediction market platform** that operates on Base:
   - Polymarket (if they support Base)
   - Kalshi (if they support Base)
   - Custom prediction market contracts on Base

2. **Update `src/markets/fetcher.ts`** to fetch real market data from your chosen platform

3. **Update `src/blockchain/trades.ts`** to interact with actual prediction market smart contracts

4. **Test on Base Sepolia testnet first** before deploying to mainnet

### Safety Checklist

Before going live:

- [ ] Tested on Base Sepolia testnet
- [ ] Verified contract deployment
- [ ] Confirmed wallet has sufficient balance
- [ ] Tested social media posting
- [ ] Verified database connection
- [ ] Reviewed risk parameters in config
- [ ] Started with small amounts (0.05-0.1 ETH)
- [ ] Set up monitoring/alerts

### Monitoring

Monitor your agent:
- Check logs regularly
- Monitor wallet balance
- Review social media posts
- Check database for trade history
- Verify onchain transactions on Basescan

## Troubleshooting

### "Missing required environment variables"
- Check that all required variables in `.env` are set
- Ensure no trailing spaces in values

### "Insufficient balance"
- Fund your wallet with more ETH
- Check `MIN_ETH_BALANCE` setting

### "Failed to fetch markets"
- Update `src/markets/fetcher.ts` with real API integration
- Check network connectivity

### "Contract call failed"
- Verify `NFT_CONTRACT_ADDRESS` is correct
- Ensure contract is deployed on Base mainnet
- Check wallet has permission (is owner)

### Social media errors
- Verify Neynar API key and signer UUID
- Check rate limits
- Ensure Farcaster account is properly set up

## Next Steps

1. Customize the AI prompts in `src/ai/prompts.ts`
2. Adjust risk parameters in `src/config/env.ts`
3. Integrate real prediction markets
4. Add more sophisticated trading strategies
5. Enhance social media personality

Good luck! 🦀
