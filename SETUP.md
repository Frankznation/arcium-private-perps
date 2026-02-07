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
- **Opinion Lab (opinion.trade):** set `USE_OPINION_LAB=true`, `OPINION_API_BASE_URL=https://openapi.opinion.trade/openapi`, and `OPINION_API_KEY` (get from [Opinion API application form](https://docs.google.com/forms/d/1h7gp8UffZeXzYQ-lv4jcou9PoRNOqMAQhyW4IwZDnII)). Market data and prices come from Opinion Open API; **trading is mock** (Open API is read-only; real orders require their CLOB SDK).
- **Polymarket:** set `USE_POLYMARKET=true`. Markets come from Gamma API, prices from CLOB; **trading is mock** unless you add CLOB order auth later. Optional: `POLYMARKET_GAMMA_URL`, `POLYMARKET_CLOB_URL`.
- `NEWS_FEEDS`: Comma-separated RSS URLs for headlines
- `TIP_RECIPIENTS`: Comma-separated Base addresses to tip
- `TIP_AMOUNT_ETH`: ETH to tip each time
- `DISABLE_MENTIONS`: Set to `true` to skip mention replies
- `DISABLE_TIPS`: Set to `true` to disable onchain tips

**Real trading (pick one market):**
- **PredictBase (recommended, Base + USDC):** `USE_PREDICTBASE=true` + `PREDICTBASE_API_KEY=your_key`. Fund your PredictBase account with USDC on Base. Orders are real by default.
- **Polymarket:** `USE_POLYMARKET=true` + `POLYMARKET_TRADING_ENABLED=true`. Needs USDC on **Polygon** and (optional) CLOB API creds.
- **Limitless:** Leave Polymarket/PredictBase off, set `LIMITLESS_TRADING_ENABLED=true`, `LIMITLESS_OWNER_ID` (numeric), `LIMITLESS_USDC_ADDRESS`, and USDC on Base.

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

### 5b. Enabling real Limitless transactions

By default the agent runs in **mock mode** (trades are recorded in the DB and posted to Farcaster, but no real USDC orders are sent). To enable **real** prediction-market orders on Limitless:

1. **Get your Limitless profile ID (owner ID)**  
   The API needs a numeric `ownerId` for orders. Options:
   - Check your Limitless account/dashboard for a "User ID" or "Profile ID".
   - Or contact Limitless support: *"I need my numeric profile ID for the orders API (ownerId). My wallet: 0x..."*  
   Then set in `.env` (and in Railway Variables if you deploy):
   ```
   LIMITLESS_OWNER_ID=12345
   ```
   (use your actual number)

2. **Set these env vars** (locally and on Railway):
   ```
   LIMITLESS_TRADING_ENABLED=true
   LIMITLESS_USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
   LIMITLESS_OWNER_ID=<your_numeric_profile_id>
   ```
   `LIMITLESS_USDC_ADDRESS` is Base mainnet USDC; do not change unless Limitless documents a different address.

3. **Fund the agent wallet with USDC on Base**  
   The same wallet as `PRIVATE_KEY` must hold **USDC on Base** for placing orders. Bridge or buy USDC and send it to that address. The agent will call `approve()` for the Limitless venue when needed.

4. **Redeploy / restart**  
   After changing env vars, redeploy on Railway (or restart `npm run dev` locally). Logs should show: `Limitless real trading: ON`.

5. **Optional**  
   - `ETH_USD_PRICE`: approximate ETH price (e.g. `3500`) if you don’t have an oracle; used for position sizing.  
   - Keep position size small at first (e.g. `MAX_POSITION_SIZE=0.05`).

**Summary:** Real transactions need `LIMITLESS_TRADING_ENABLED=true`, `LIMITLESS_USDC_ADDRESS`, `LIMITLESS_OWNER_ID`, and USDC in the wallet. NFT mints and ETH tips are already real when the contract is deployed and the wallet has ETH.

**I want to use real trades:** Right now **real trading is only supported on Limitless** (Base + USDC). If you were using Polymarket for market data, switch to Limitless for both data and real orders: set `USE_POLYMARKET=false` (or remove it), set `USE_OPINION_LAB=false` (or remove it), then follow 5b above. **Polymarket real orders** are not implemented; they would require Polygon, USDC on Polygon, and Polymarket’s CLOB API (L2 auth). You can keep using Polymarket for **mock** trading (data + simulated trades).

### 5c. Using Opinion Lab (opinion.trade)

To use **Opinion Lab** instead of Limitless for market data:

1. **Get an API key:** Fill out the [Opinion Open API application form](https://docs.google.com/forms/d/1h7gp8UffZeXzYQ-lv4jcou9PoRNOqMAQhyW4IwZDnII).
2. **Set env vars** (in `.env` and Railway Variables):
   ```
   USE_OPINION_LAB=true
   OPINION_API_BASE_URL=https://openapi.opinion.trade/openapi
   OPINION_API_KEY=your_opinion_api_key
   ```
3. **Restart / redeploy.** Logs will show: `Market source: Opinion Lab`.
4. **Behaviour:** The agent fetches **markets** and **prices** from Opinion Open API. **Trades are mock** (recorded in DB and posted to Farcaster, but no real orders are sent). Opinion’s Open API is read-only; real order placement would require their [CLOB SDK](https://pypi.org/project/opinion-clob-sdk/) (Python) or a future REST order API.

### 5d. Using PredictBase (Base + USDC)

[PredictBase](https://predictbase.app) is a prediction market on **Base** — same chain as your wallet, **USDC on Base** (no Polygon).

1. **Get an API key:** [PredictBase Docs → Get API Key](https://predictbase.gitbook.io/docs/developer/get-api-key).
2. **Set env vars** (in `.env` and Railway):
   ```
   USE_PREDICTBASE=true
   PREDICTBASE_API_KEY=your_api_key
   ```
   Optional: `PREDICTBASE_API_URL=https://api.predictbase.app` (default).
3. **Fund with USDC on Base:** Deposit USDC into your PredictBase account (dashboard / profile). Your `PRIVATE_KEY` wallet must be the one linked to the API key.
4. **Restart / redeploy.** Logs will show: `Market source: PredictBase`. Orders are **real** (limit orders via API).

Docs: [PredictBase Developer](https://predictbase.gitbook.io/docs/developer/endpoints), [Place & Manage Orders](https://predictbase.gitbook.io/docs/developer/endpoints/place-and-manage-orders).

### 5e. Using Polymarket

To use **Polymarket** for market data (no API key required):

1. **Set env vars** (in `.env` and Railway Variables):
   ```
   USE_POLYMARKET=true
   ```
   Optional overrides (defaults are fine):
   ```
   POLYMARKET_GAMMA_URL=https://gamma-api.polymarket.com
   POLYMARKET_CLOB_URL=https://clob.polymarket.com
   ```

2. **Restart / redeploy.** Logs will show: `Market source: Polymarket`.

3. **Behaviour:** The agent fetches **markets** from Polymarket’s Gamma API and **prices** from the CLOB API. By default **trades are mock**. For **real** Polymarket orders, see **5e** below.

### 5f. Real Polymarket trading

Polymarket runs on **Polygon** (chain 137). Your `PRIVATE_KEY` wallet is used for signing; you must fund that address (or your Polymarket proxy) with **USDC on Polygon**.

1. **Set env vars** (in `.env` and Railway):
   ```
   USE_POLYMARKET=true
   POLYMARKET_TRADING_ENABLED=true
   POLYMARKET_CHAIN_ID=137
   ```
   For EOA (direct wallet) trading, **funder** is your wallet address. Either leave `POLYMARKET_FUNDER_ADDRESS` unset (it will use your wallet) or set it to your Polymarket deposit address (see [polymarket.com/settings](https://polymarket.com/settings)).  
   Optional: `POLYMARKET_SIGNATURE_TYPE=0` (EOA), `1` (Magic/email), `2` (Gnosis Safe proxy).

2. **API credentials:** On first run the agent will call Polymarket’s L1 auth to **create or derive** API key/secret/passphrase (no manual signup). To reuse existing creds, set:
   ```
   POLYMARKET_API_KEY=...
   POLYMARKET_API_SECRET=...
   POLYMARKET_API_PASSPHRASE=...
   ```

3. **Fund with USDC on Polygon:** Send USDC (Polygon) to your funder address. The same `PRIVATE_KEY` gives the same address on Polygon as on Base.

4. **Restart / redeploy.** Logs will show: `Polymarket real trading: ON`.

5. **Summary:** Real Polymarket trades need `POLYMARKET_TRADING_ENABLED=true`, USDC on Polygon, and (optionally) stored API creds. See [Polymarket CLOB auth](https://docs.polymarket.com/developers/CLOB/authentication) and [create order](https://docs.polymarket.com/developers/CLOB/orders/create-order).

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
