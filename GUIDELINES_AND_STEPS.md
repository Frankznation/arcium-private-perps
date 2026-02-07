# Guidelines and Steps – CrabTrader & Base Builder Quest

Use this as your checklist. You’re new to tech/coding and building your first agent with support from friends. Follow the guidelines, then do the steps in order.

---

## Guidelines (rules to follow)

1. **Don’t rush**  
   Do one step at a time. If something fails, note the error and ask your tech friends or check the error message before changing lots of things.

2. **Keep secrets safe**  
   Never put your real `PRIVATE_KEY` or API keys in code, in screenshots, or in public chats. Only in `.env` (and `.env` is in `.gitignore`).

3. **Start with mock trading**  
   Use `LIMITLESS_TRADING_ENABLED=false` until you understand the flow and have tested. Turn on real trading only when you and your friends are comfortable.

4. **Check balance before going live**  
   Your wallet needs a bit of ETH on Base for gas. Keep at least the amount you set in `MIN_ETH_BALANCE` (e.g. 0.01 ETH).

5. **Use one environment**  
   Prefer one machine/terminal for running the agent (e.g. your laptop or a small VPS). Avoid running the same agent from two places at once.

6. **Read logs**  
   When you run the agent, watch the console output. It tells you what it’s doing, if trades ran, and if something failed.

7. **Ask for help**  
   If a step doesn’t work, copy the exact error message and the step number. Share that with your tech friends so they can help quickly.

---

## Steps (in order)

### Step 1 – Install Node and clone the project

- Install **Node.js 18 or higher**: https://nodejs.org/  
  (Your tech friend can help with this.)
- Open a terminal, go to the folder where you want the project, then:
  - If you have a repo URL:  
    `git clone <your-repo-url>`  
    `cd crab-trader-agent`
  - If you already have the folder:  
    `cd crab-trader-agent`
- Run:  
  `npm install`  
  Wait until it finishes without errors.

### Step 2 – Create a Base wallet and get a little ETH

- Create a wallet (e.g. MetaMask, Rabby, or another wallet that supports Base).
- Add the **Base network** to the wallet (chain ID 8453).
- Get a small amount of **ETH on Base** (for gas). You can use a faucet or bridge; your friends can suggest one.
- Export or copy your **private key** for this wallet. You’ll put it in `.env` in the next step.  
  **Guideline:** Use a wallet only for this project, not your main funds.

### Step 3 – Get API keys and create `.env`

- Get these (your tech friends can show you where to sign up):
  - **Anthropic**: https://console.anthropic.com/ → create an API key.
  - **Neynar** (Farcaster): https://neynar.com/ → get API key and a Farcaster signer UUID.
  - **Supabase**: https://supabase.com/ → create a project, get Project URL and anon key.
- In the project folder, copy the example env file:
  - `cp .env.example .env`
- Open `.env` in a text editor and fill in **at least**:
  - `PRIVATE_KEY` = your Base wallet private key
  - `BASE_RPC_URL` = `https://mainnet.base.org` (or another Base RPC)
  - `ANTHROPIC_API_KEY` = your Anthropic key
  - `ANTHROPIC_MODEL` = e.g. `claude-3-5-sonnet-20241022` (check Anthropic docs for the exact name)
  - `NEYNAR_API_KEY` = your Neynar key
  - `FARCASTER_SIGNER_UUID` = your Farcaster signer UUID
  - `SUPABASE_URL` = your Supabase project URL
  - `SUPABASE_KEY` = your Supabase anon key
- For a **beginner / safe** setup, set:
  - `LIMITLESS_TRADING_ENABLED=false`  
  (so the agent only does mock trades and won’t spend real money on Limitless).
- Save the file. **Guideline:** Never commit `.env` to Git.

### Step 4 – Set up the database

- In Supabase: go to your project → **SQL Editor**.
- Open the file `database/schema.sql` from this project.
- Copy its contents and run them in the SQL Editor.
- If it says a table or trigger already exists, you can ignore or adjust (your tech friend can help).  
  After this, the agent has the tables it needs.

### Step 5 – Deploy the NFT contract (optional but recommended)

- You need a small amount of ETH on Base for deployment.
- In the project folder run:
  - `npm run compile`
  - `npm run deploy:hardhat`
- The script will print an address like `CrabTradeNFT deployed to: 0x...`. Copy that address.
- Put it in `.env` as:
  - `NFT_CONTRACT_ADDRESS=0x...`  
  (so the agent can mint NFTs for notable trades.)

### Step 6 – Run the agent

- In the project folder run:
  - `npm run dev`
- Watch the logs. You should see:
  - Configuration validated
  - Wallet initialized
  - Fetched X markets
  - AI analysis, then decisions
  - Trade execution summary (e.g. 0 executed if mock, or real if you enabled Limitless later)
  - NFT processing and Farcaster posts if applicable
- If you see errors, copy the **full error message** and the step where it happened, then ask your tech friends.  
  **Guideline:** Don’t run the same agent from two different terminals/machines at the same time.

### Step 7 – Check status (optional)

- In another terminal, from the project folder:
  - `npm run check:status`
- This shows wallet balance, trades in the DB, and whether NFTs were minted. Use it to confirm things are working.

### Step 8 – Base Builder Quest and sharing your work

- **Quest:** Follow the official Base Builder Quest / OpenClaw instructions (e.g. submit your project, link to repo or demo as required).
- **Thread:** When you’re ready, use the “Hello everyone” thread we wrote. Post it tweet by tweet. Add your repo link, Farcaster link, or Basescan link in the last tweet.
- **Guideline:** Be honest that you’re new and built this with support. That’s the story that fits the thread.

---

## Quick reference

| Step | What you do |
|------|------------------|
| 1    | Install Node, clone repo, `npm install` |
| 2    | Create Base wallet, get a little ETH, get private key |
| 3    | Get Anthropic, Neynar, Supabase keys; create `.env`; set `LIMITLESS_TRADING_ENABLED=false` |
| 4    | Run `database/schema.sql` in Supabase SQL Editor |
| 5    | `npm run compile` then `npm run deploy:hardhat`; set `NFT_CONTRACT_ADDRESS` in `.env` |
| 6    | `npm run dev` and watch logs |
| 7    | `npm run check:status` to verify |
| 8    | Submit to Base Builder Quest; post your thread when ready |

---

If you want, we can add a second section later with “Steps for posting the Twitter thread” (e.g. how to paste each tweet, add links, and when to post).
