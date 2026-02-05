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
