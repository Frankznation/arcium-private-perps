# I Built an Autonomous AI Agent That Trades on Base and Posts to Farcaster — Here’s How

**A beginner’s journey building CrabTrader: no human in the loop, just an AI making decisions every 3 minutes and posting the results onchain.**

---

I’m relatively new to coding. I didn’t study computer science. But I love building on Base — low fees, a clear ecosystem, and a community that makes it feel possible to ship something real. So when the OpenClaw Builder Quest came around, I decided to build my first autonomous agent: an AI that trades prediction markets, mints NFTs when it hits big wins or losses, and posts everything to Farcaster. No dashboard. No human clicking buttons. Just a loop that runs every 3 minutes, forever.

This is that story — and a breakdown of what the bot actually does so you can build something similar or run your own.

---

## What Is CrabTrader?

CrabTrader is a Node.js application that runs 24/7 (on my laptop, or on Railway in the cloud). It doesn’t have a website or a UI. You “see” it through:

- **Farcaster** — where it posts round summaries, trade entries and exits, NFT mints, and market commentary
- **Base blockchain** — where its wallet transacts and its NFT contract mints trade receipts
- **Logs** — where every iteration is written (markets fetched, decisions made, trades executed)

The personality is a crab: calm, a bit of puns, honest about losses, and transparent that it’s an AI. It never gives financial advice.

---

## Why Prediction Markets and Base?

I wanted the agent to do something concrete and verifiable. Prediction markets (will X happen by date Y?) are a clear use case: the AI reads data, makes a decision (YES or NO), and we record it. Base made sense because gas is cheap, the chain is fast, and the OpenClaw quest was explicitly about building on Base. I plugged in Limitless Exchange for market data and, eventually, for real order placement — but I started in mock mode so I could test the full pipeline without risking funds.

---

## The Stack

- **Runtime:** Node.js 20+, TypeScript
- **Blockchain:** Viem, Base mainnet
- **AI:** Anthropic Claude API (structured JSON output for BUY/SELL/HOLD decisions)
- **Markets:** Limitless Exchange API (market data; orders when real trading is enabled)
- **Social:** Neynar API for Farcaster (casts, replies)
- **Database:** Supabase (PostgreSQL) — trades, portfolio snapshots, social post history
- **Smart contract:** A simple ERC-721 (CrabTradeNFT) that mints a “trade receipt” when a closed trade is notable (e.g. >20% P&L)

No frontend. No React. Just one long-running process and a lot of environment variables.

---

## What the Bot Does Every 3 Minutes

The agent runs in an infinite loop. Each iteration does the following, in order:

1. **Health check** — Verifies the wallet has at least a minimum ETH balance (for gas). If not, it logs a warning and can post an alert.

2. **Fetch markets** — Calls the Limitless API to get active prediction markets: name, slug, YES/NO prices, volume. These are the only instruments the AI can choose from.

3. **Portfolio state** — Reads the database for open trades and the wallet balance. For each open position it fetches the current market price and computes unrealized P&L.

4. **News (optional)** — Pulls headlines from RSS feeds (e.g. crypto news) and passes them to the AI as extra context.

5. **AI analysis** — Sends Claude a prompt with: portfolio value, open positions with P&L, list of markets with prices, and news. The prompt includes strict risk rules (max position size, stop loss, take profit, max open positions). Claude returns a JSON object: an array of decisions (action, marketId, marketName, position YES/NO, amountEth, reasoning, confidence) plus market commentary and risk assessment.

6. **Execute decisions** — For each BUY: resolve the market slug, compute position size in USD, and either place a mock trade (record in DB only) or a real order via Limitless (with USDC approve + EIP-712 signed order). Record the trade in Supabase and post a trade-entry cast to Farcaster. For each SELL: find the open trade, get current price, close the position (mock or real), update the trade with exit price and P&L, post an exit cast.

7. **Notable trades → NFTs** — Scan closed trades that don’t yet have an NFT. If |P&L| ≥ threshold (e.g. 20%), call the CrabTradeNFT contract’s `mintTrade` (and `isNotableTrade`). Store the token ID on the trade and post an NFT mint cast.

8. **Mentions** — Optionally fetch Farcaster (and Twitter) mentions and use the AI to generate replies, then post them.

9. **Daily summary** — Once per 24 hours, post a portfolio summary (balance, open positions, daily P&L).

10. **Round summary** — Every iteration, post a short cast: “Scanned X markets, Y decisions, Z trades this round” so the feed shows constant activity.

11. **Tips (optional)** — On a schedule, send a small amount of ETH to a list of addresses (e.g. creators or tools I want to support).

12. **Sleep** — Wait 3 minutes (configurable via `LOOP_INTERVAL_MS`), then repeat from step 1.

So in one sentence: **every 3 minutes the bot fetches markets, asks Claude what to do, executes (or mocks) trades, mints NFTs for big moves, and posts the results to Farcaster.**

---

## Why Mock Mode First?

I wanted the full pipeline to work before risking real funds. So the agent runs with `LIMITLESS_TRADING_ENABLED=false`. In that mode, “trades” are recorded in the database and posted to Farcaster, but no real USDC orders are sent to Limitless. That let me:

- Verify the AI returns valid decisions and that we parse them correctly
- Ensure market slugs resolve and that we’d pass the right parameters for real orders later
- Test Farcaster posting, NFT minting, and the round summary without moving real money

Once I’m satisfied and have the exchange API fully set up (e.g. profile ID for orders), I’ll flip the switch to real trading. The code path is already there; it’s a config change.

---

## Lessons Learned

- **Start with one loop.** One iteration (fetch → decide → act → post) is easier to debug than a full “product.” Get that right, then add NFTs, mentions, and polish.
- **Structured AI output is critical.** Using a schema (e.g. Zod) and asking Claude for JSON with exact field names (marketId, marketName, action, amountEth) avoids parsing bugs and wrong trades.
- **Env vars everywhere.** Wallet key, RPC, API keys for Anthropic, Neynar, Limitless, Supabase — the agent is just config + code. Document them (e.g. in a README and .env.example) so you (and others) can run it.
- **Deploy early.** Running on Railway (or similar) meant I could close my laptop and still have the bot post every 3 minutes. That made it feel “real” and forced me to fix production issues (Node version, lock file, build with esbuild instead of tsc to avoid dependency type errors).
- **Community helps.** I had tech friends to ask when I got stuck. If you’re new like me, find a builder community (Base, Farcaster, Twitter) and ship in public.

---

## How You Can Use It

- **Follow the bot:** The Farcaster account linked to my agent posts every round. You’ll see what it’s “thinking,” what it traded, and when it mints NFTs. No signup beyond Farcaster.
- **Run your own:** The project is open source. Clone the repo, add your own keys (Anthropic, Neynar, Supabase, Limitless if you want real trading), deploy the NFT contract, and run it locally or on Railway. You’ll have your own CrabTrader with your wallet and your Farcaster.
- **Remix it:** Change the prompt, the risk rules, the markets, or the social platform. The core loop (fetch → AI → act → post) is the same; the rest is configuration and copy.

---

## What’s Next?

- Enable real Limitless trading once the API/profile setup is solid.
- Optionally add a minimal “status” page (e.g. last iteration time, last trade) so there’s a URL to share.
- Keep iterating on the AI prompt and risk parameters based on how the bot behaves in production.

---

If you’re new to building agents or to Base, I hope this gives you a clear picture of what “an AI that trades and posts” actually looks like under the hood. You don’t need to be an expert — you need curiosity, a wallet, some API keys, and the willingness to run one loop until it works.

**CrabTrader:** [your Farcaster link]  
**Repo:** [your GitHub link]  
**Built for the OpenClaw Builder Quest on Base.** 🦀

---

*Disclaimer: This agent is for learning and experimentation. It can lose funds. I run it in mock mode while testing. Never risk more than you can afford to lose, and the bot does not provide financial advice.*
