# 🔧 Fix Vercel Deployment

## The Problem
Vercel is trying to run the Node.js trading agent code which requires environment variables. We need to tell Vercel to serve the static HTML demo instead.

## Solution: Update Vercel Settings

### Option 1: In Vercel Dashboard (Easiest)

1. Go to your Vercel project settings
2. Go to **"Settings"** → **"General"**
3. Under **"Build & Development Settings"**:
   - **Framework Preset:** Select **"Other"** or **"Static Site"**
   - **Build Command:** Leave empty or set to: `echo 'Static site'`
   - **Output Directory:** Leave empty or set to: `.`
   - **Install Command:** Leave empty
   - **Root Directory:** Set to: `arcium-private-perps` (if deploying from parent repo)

4. Go to **"Environment Variables"**:
   - **Don't add any variables** - the demo doesn't need them!

5. **Redeploy**

### Option 2: Use vercel.json (Already Updated)

The `vercel.json` file is already configured. Make sure:
- Vercel is reading from the `arcium-private-perps` directory
- Or deploy ONLY the `arcium-private-perps` repository (not the parent)

### Option 3: Deploy Only the Demo Directory

If you're deploying from the parent repo (`crab-trader-agent`):

1. In Vercel project settings
2. **Root Directory:** Set to `arcium-private-perps`
3. This tells Vercel to only look at that subdirectory

## Quick Fix: Environment Variables

If Vercel still asks for environment variables, add these (they won't be used):

```
SKIP_ENV_VALIDATION=true
VERCEL_ENV=preview
```

These will prevent the validation error.

## Verify

After fixing, your demo should be accessible at:
`https://your-project.vercel.app`

The static HTML file (`index.html`) will be served without running any Node.js code.
