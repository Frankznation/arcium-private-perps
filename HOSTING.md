# Hosting CrabTrader on Vercel

The agent runs as **one iteration per cron trigger** on Vercel (no long-running loop). Each cron hit runs: health check → fetch markets → AI → trades → NFTs → Farcaster.

---

## 1. Prerequisites

- All **env vars** from `.env` (see SETUP.md) set in Vercel.
- **Vercel account**: [vercel.com](https://vercel.com).  
  - **Hobby**: cron can run at most **once per day**.  
  - **Pro**: cron can run **every 15 minutes** (or more often).

---

## 2. Deploy

### Option A: Vercel CLI

```bash
npm i -g vercel
vercel login
vercel
```

Follow prompts (link to existing project or create new one). Then add env vars (see step 3) and redeploy:

```bash
vercel --prod
```

### Option B: Git (GitHub/GitLab/Bitbucket)

1. Push your repo to GitHub (or GitLab/Bitbucket).
2. Go to [vercel.com/new](https://vercel.com/new).
3. Import the repo. Root directory = project root.
4. **Build Command**: leave default or set to `npm run build`.
5. **Output Directory**: leave default (Vercel will use the API and build output).
6. Deploy. Then add env vars in the project **Settings → Environment Variables**.

---

## 3. Environment variables on Vercel

In the Vercel project: **Settings → Environment Variables**. Add the same variables you have in `.env` (see SETUP.md and .env.example), including:

- `PRIVATE_KEY`
- `BASE_RPC_URL`
- `NFT_CONTRACT_ADDRESS`
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL`
- `NEYNAR_API_KEY`
- `FARCASTER_SIGNER_UUID`
- `SUPABASE_URL`
- `SUPABASE_KEY`
- Any Limitless / news / tip / optional vars you use.

**Cron auth (recommended):**

- `CRON_SECRET` – e.g. a long random string (≥16 chars).  
  Vercel Cron will send it when calling `/api/run`. The API checks `Authorization: Bearer <CRON_SECRET>`.

Redeploy after adding or changing env vars.

---

## 4. Cron schedule

- **vercel.json** is already set to call `/api/run` on a schedule.
- Default: `*/15 * * * *` = **every 15 minutes** (needs **Pro**).
- **Hobby**: change in `vercel.json` to run at most once per day, e.g.:

  ```json
  "schedule": "0 9 * * *"
  ```
  (once daily at 09:00 UTC).

After you change `vercel.json`, push and redeploy.

---

## 5. Timeout

- One iteration can take 30–60+ seconds (AI + RPC + Farcaster).
- **api/run.ts** sets `maxDuration: 60`.
- **Pro**: 60s is supported. **Hobby**: 10s – you may need to simplify the iteration or move to Pro/Railway/Render for reliability.

---

## 6. Manual run (no cron)

You can trigger one iteration manually:

```bash
curl -X POST "https://YOUR_VERCEL_URL.vercel.app/api/run" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Useful to test after deploy.

---

## 7. Summary

| Step | Action |
|------|--------|
| 1 | Have all .env vars ready |
| 2 | Deploy via `vercel` CLI or Git import |
| 3 | Add env vars (and `CRON_SECRET`) in Vercel project settings |
| 4 | Adjust cron in `vercel.json` if needed (e.g. daily for Hobby) |
| 5 | Redeploy after env or vercel.json changes |
| 6 | Optionally call `/api/run` with `Authorization: Bearer CRON_SECRET` to test |

The agent will run automatically on the schedule; no server to keep open.
