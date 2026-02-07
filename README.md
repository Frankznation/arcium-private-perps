<<<<<<< HEAD
# 🦀 CrabTrader - Autonomous AI Trading Agent

An autonomous AI agent that trades on Base blockchain prediction markets, mints NFTs for notable trades, and engages with the community on X (Twitter) and Farcaster.

Built for the [OpenClaw Builder Quest](https://base.org/bbq) competition.

## Features

- 🤖 **Fully Autonomous**: No human-in-the-loop required
- 📊 **AI-Powered Trading**: Uses Claude API for market analysis and trade decisions
- 🎨 **NFT Minting**: Automatically mints NFTs for notable trades (>20% gain/loss)
- 💬 **Social Engagement**: Posts trades and engages with community on X and Farcaster
- 🔒 **Risk Management**: Built-in stop-loss, take-profit, and position sizing
- 📈 **Onchain Verification**: All trades and NFTs are verifiable on Base blockchain

## Architecture

```
┌─────────────────┐
│  Autonomous     │
│  Loop (index.ts)│
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼──────┐
│  AI   │ │ Markets │
│ Claude│ │ Fetcher │
└───┬───┘ └──┬──────┘
    │        │
┌───▼────────▼───┐
│  Trade         │
│  Execution     │
└───┬────────────┘
    │
┌───▼────────────┐
│  Blockchain    │
│  (Base)        │
└───┬────────────┘
    │
┌───▼────────────┐
│  Social Media  │
│  (X/Farcaster) │
└────────────────┘
```

## Tech Stack

- **Runtime**: Node.js 18+ with TypeScript
- **Blockchain**: Viem, Base mainnet
- **AI**: Anthropic Claude API
- **Social**: Twitter API v2, Neynar API (Farcaster)
- **Database**: Supabase (PostgreSQL)
- **Smart Contracts**: Solidity 0.8.20+, OpenZeppelin

## Prerequisites

1. Node.js 18+ and npm
2. Base wallet with ETH for gas fees
3. API keys:
   - Anthropic API key
   - Neynar API key (for Farcaster)
   - Supabase account

## Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd crab-trader-agent
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your credentials
```

4. Set up database schema:
```bash
# Run the SQL schema in your Supabase dashboard
# See database/schema.sql
```

5. Deploy the NFT contract:
```bash
# See deployment section below
```

## Configuration

### Environment Variables

Required variables in `.env`:

```env
# Blockchain
PRIVATE_KEY=your_wallet_private_key
BASE_RPC_URL=https://mainnet.base.org
NFT_CONTRACT_ADDRESS=deployed_contract_address

# AI
ANTHROPIC_API_KEY=your_anthropic_key
ANTHROPIC_MODEL=claude-4-sonnet-20250219

# Farcaster
NEYNAR_API_KEY=...
FARCASTER_SIGNER_UUID=...

# Database
SUPABASE_URL=...
SUPABASE_KEY=...

# Agent Config
MIN_ETH_BALANCE=0.01
LOOP_INTERVAL_MS=900000  # 15 minutes
MAX_POSITION_SIZE=0.1    # 10% of portfolio

# Limitless API (markets)
LIMITLESS_API_BASE_URL=https://api.limitless.exchange
LIMITLESS_API_KEY=your_limitless_api_key
LIMITLESS_CATEGORY_ID=
LIMITLESS_MARKETS_URL=
LIMITLESS_API_KEY_HEADER=Authorization
LIMITLESS_API_KEY_PREFIX=Bearer

# News + Tips (optional)
NEWS_FEEDS=https://feeds.feedburner.com/CoinDesk
TIP_RECIPIENTS=0x...,0x...
TIP_AMOUNT_ETH=0.0005
TIP_MIN_BALANCE_ETH=0.02
TIP_INTERVAL_MS=86400000
DISABLE_MENTIONS=true
DISABLE_TIPS=false
```

## Database Schema

The agent requires the following tables in Supabase/PostgreSQL:

See `database/schema.sql` for the complete schema.

Key tables:
- `trades`: Stores all trade entries and exits
- `portfolio_snapshots`: Daily portfolio snapshots
- `social_posts`: Records of all social media posts
- `mentions`: Community mentions and replies

## Smart Contract Deployment

### Using Hardhat

1. Install Hardhat:
```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
```

2. Create `hardhat.config.js`:
```javascript
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.20",
  networks: {
    base: {
      url: process.env.BASE_RPC_URL,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
};
```

3. Compile and deploy:
```bash
npx hardhat compile
npx hardhat run scripts/deploy.js --network base
```

4. Update `.env` with the deployed contract address.

### Using Foundry

```bash
forge build
forge create contracts/CrabTradeNFT.sol:CrabTradeNFT \
  --rpc-url $BASE_RPC_URL \
  --private-key $PRIVATE_KEY \
  --constructor-args $OWNER_ADDRESS
```

## Running the Agent

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

### Deploy to Railway/Render

1. Connect your GitHub repository
2. Set environment variables in the platform dashboard
3. Set build command: `npm run build`
4. Set start command: `npm start`
5. Deploy!

## How It Works

### Autonomous Loop (Every 15 minutes)

1. **Health Check**: Verifies wallet balance and system status
2. **Market Data**: Fetches current prediction market prices
3. **AI Analysis**: Claude analyzes markets and generates trade decisions
4. **Trade Execution**: Executes BUY/SELL decisions on Base
5. **NFT Minting**: Mints NFTs for notable trades (>20% gain/loss)
6. **Community Engagement**: Replies to mentions on X and Farcaster
7. **Daily Summary**: Posts portfolio summary every 24 hours

### Risk Management

- Maximum 10% of portfolio per trade
- Stop loss at -15%
- Take profit at +30%
- Minimum 0.01 ETH gas buffer
- Maximum 3 open positions

### Social Media

The agent posts:
- Trade entry announcements with transaction links
- Trade exit announcements with P&L
- NFT mint announcements
- Daily portfolio summaries
- Replies to community mentions

All posts include:
- Onchain transaction links (Basescan)
- Transparent disclosure of being an AI agent
- Crab-themed personality (sparingly)

## Competition Requirements

✅ **Creates onchain apps**: Deploys and interacts with smart contracts  
✅ **Deploys onchain tokens**: Mints ERC-721 NFTs  
✅ **Interacts with community**: Posts on X and Farcaster  
✅ **No-human-in-the-loop**: Fully autonomous  
✅ **Onchain verification**: All activity verifiable on Base  
✅ **Live on social**: Active X and Farcaster presence  

## Monitoring

The agent logs all activity. Monitor:
- Trade executions
- NFT mints
- Social media posts
- Balance alerts
- Error logs

## Safety Features

- Error handling and retry logic
- Rate limiting for API calls
- Balance monitoring with alerts
- Graceful shutdown on SIGINT/SIGTERM
- Transaction verification before posting

## Troubleshooting

### Low Balance Alert
- Fund the wallet with more ETH
- Check gas prices on Base

### API Rate Limits
- Increase `LOOP_INTERVAL_MS` in `.env`
- Check API key limits

### Contract Errors
- Verify `NFT_CONTRACT_ADDRESS` is correct
- Ensure contract is deployed on Base mainnet
- Check contract owner matches wallet address

## Development

### Project Structure

```
crabtrader/
├── src/
│   ├── index.ts           # Main autonomous loop
│   ├── config/            # Configuration
│   ├── blockchain/        # Wallet, contracts, trades
│   ├── ai/                # Claude integration
│   ├── social/            # Twitter/Farcaster
│   ├── markets/           # Market data fetching
│   ├── nft/               # NFT minting logic
│   ├── database/          # Database operations
│   └── utils/             # Helpers
├── contracts/             # Solidity contracts
├── scripts/               # Deployment scripts
└── database/              # Database schema
```

### Adding New Features

1. Market integrations: Extend `src/markets/fetcher.ts`
2. Trading strategies: Modify `src/ai/prompts.ts`
3. Social templates: Update `src/social/templates.ts`
4. Risk rules: Adjust config in `src/config/env.ts`

## License

MIT

## Disclaimer

This is an autonomous trading agent. It may lose funds. Always:
- Start with small amounts
- Monitor closely initially
- Never risk more than you can afford to lose
- The agent is transparent about being AI - it does not give financial advice

## Support

For issues or questions:
- Check the logs
- Review environment variables
- Verify API keys are valid
- Ensure database schema is set up correctly

---

Built with 🦀 for Base OpenClaw Builder Quest
=======
## 🦀 CrabTrader – Autonomous Prediction Market Agent on Base

CrabTrader is an **autonomous AI agent** that:

- Trades **prediction markets on Base** via Limitless Exchange  
- Mints **CrabTrade NFTs** for notable trades (wins and losses)  
- Posts live updates to **Farcaster**  
- Stores full history in **Supabase/Postgres**  
- Runs 24/7 on **Node.js + TypeScript + Claude**

---

## ⚙️ Architecture (High‑Level)
Farcaster (Neynar) ←→ CrabTrader (Node + TS + Claude) ←→ Base L2
↑ ↑ ↑
│ │ │
Supabase DB Limitless API NFT + USDC


Main pieces:

- `src/index.ts` – main loop (health checks, AI, trades, posts)
- `src/ai/*` – prompts + analyzer using Anthropic Claude
- `src/blockchain/*` – wallet, NFT contract, ERC20 approve, trades
- `src/markets/*` – Limitless markets + order signing
- `src/social/*` – Farcaster integration + post templates
- `src/database/*` – Supabase client + typed queries
- `contracts/CrabTradeNFT.sol` – ERC‑721 for trade NFTs

---

## 🔨 How It Works (Loop)

Every iteration CrabTrader:

1. **Checks health**
   - Wallet funded (ETH ≥ `MIN_ETH_BALANCE`)
   - APIs and config available

2. **Fetches context**
   - Active markets from Limitless (`/markets/active/:categoryId`)
   - News headlines from configured RSS feeds

3. **Asks the AI (Claude)**
   - Generates a small set of decisions: BUY / SELL / HOLD
   - Includes position, size (ETH), reasoning, confidence

4. **Executes trades**
   - **BUY**:
     - Validates position size vs portfolio
     - Resolves Limitless market slug
     - Ensures USDC `approve()` to the venue
     - Signs an EIP‑712 order and submits to Limitless
     - Records trade in DB and posts a Farcaster entry
   - **SELL**:
     - Finds open trade in DB
     - Gets current price
     - Places a SELL order
     - Updates trade with exit, P&L, and posts exit summary

5. **Mints NFTs**
   - Checks closed trades for |P&L| > threshold
   - Calls `isNotableTrade()` + `mintTrade()` on `CrabTradeNFT`
   - Stores `nft_token_id` and posts an NFT cast

6. **Posts social updates**
   - Market updates (“CRABTRADER MARKET UPDATE”)
   - Daily portfolio summaries
   - (Optionally) replies to mentions

7. **Sleeps** for `LOOP_INTERVAL_MS` and repeats.

---

## 🧰 Getting Started

### 1. Clone & Install

git clone https://github.com/<your-username>/crab-trader-agent.git
cd crab-trader-agent
npm install

2. Environment Variables
Copy .env.example to .env and fill in:
# Wallet / chain
PRIVATE_KEY=0x...                       # bot wallet on Base (keep secret)
BASE_RPC_URL=https://mainnet.base.org
NFT_CONTRACT_ADDRESS=0x...              # deployed CrabTradeNFT

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-5-sonnet-20240620

# Database (either DATABASE_URL or Supabase URL+KEY)
DATABASE_URL=postgres://...
# or
SUPABASE_URL=...
SUPABASE_KEY=...

# Farcaster / Neynar
NEYNAR_API_KEY=...
FARCASTER_SIGNER_UUID=...

# Limitless
LIMITLESS_TRADING_ENABLED=false         # start in test mode
LIMITLESS_API_BASE_URL=https://api.limitless.exchange
LIMITLESS_CATEGORY_ID=1
LIMITLESS_API_KEY=...
LIMITLESS_API_KEY_HEADER=X-API-Key
LIMITLESS_API_KEY_PREFIX=
LIMITLESS_ORDER_TYPE=GTC
LIMITLESS_FEE_RATE_BPS=0
LIMITLESS_USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
ETH_USD_PRICE=3000                      # temp until you add a real oracle

# Agent behavior
MIN_ETH_BALANCE=0.01
MAX_POSITION_SIZE=0.1
STOP_LOSS_BPS=1500
TAKE_PROFIT_BPS=3000
NOTABLE_TRADE_THRESHOLD_BPS=2000
LOOP_INTERVAL_MS=900000                 # 15 minutes

# Features
DISABLE_MENTIONS=true
DISABLE_TIPS=true
POST_LAUNCH_ANNOUNCEMENT=false
LOG_LEVEL=info
NODE_ENV=production

3. Database Setup
Run the SQL from database/schema.sql once in your Postgres / Supabase instance.
(If you already have the tables, only run the ALTER TABLE statements you need.)
)
🚀 Running the Agent
Fund the wallet
Send ETH on Base to the bot wallet (gas + safety).
When you’re ready for real trading, send USDC on Base as well.

Start in test mode

# in .env
LIMITLESS_TRADING_ENABLED=false
You’ll see full logs and Farcaster posts, but trades are mocked (no real USDC orders).
Enable real trading (carefully)
After you confirm behavior in test mode:
npm run dev
LIMITLESS_TRADING_ENABLED=true

Restart:
npm run dev

Now the bot:
Approves USDC to the Limitless venue
Submits real BUY/SELL orders
Records everything onchain and in the DB

🔒 Safety & Best Practices
Use a dedicated wallet just for CrabTrader; never your main wallet.
Fund it with only what you’re willing to risk.
Keep .env out of git (.gitignore already includes it).
If a key or private key is ever exposed, revoke/rotate it immediately.
Start with small MAX_POSITION_SIZE and conservative STOP_LOSS_BPS / TAKE_PROFIT_BPS.

.
📝 Status
CrabTrader is live on Base:
Deploys and mints NFTs via CrabTradeNFT
Trades Limitless markets autonomously
Posts real‑time updates on Farcaster
Contributions and feedback are welcome—especially around new strategies, better risk controls, and UI ideas for monitoring the agent.
```
>>>>>>> 35d0af43730d4a5839382bf3a746db66fd3103df
