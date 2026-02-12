# V0.dev Source Code - Arcium Private Perps Demo

## Option 1: Copy the React Component

Copy the code from `v0-component.tsx` and paste it into V0.dev

## Option 2: Use This Prompt

Copy this prompt and paste it into V0.dev:

```
Create an interactive demo application for "Arcium Private Perps" - a private perpetuals trading platform built on Solana with Arcium privacy-preserving computation.

Design Requirements:
- Modern gradient purple/blue theme
- Clean white cards with left border accents
- Responsive layout
- Interactive buttons with hover effects
- Dark code-style result boxes

Features Needed:

1. Header Section:
   - Gradient background (purple-600 to indigo-800)
   - Title: "🔒 Arcium Private Perps"
   - Subtitle: "Interactive Demo - Private Perpetuals Trading Platform"
   - Badges: "✅ Live Demo", "🔐 Privacy Enabled", "⚡ Interactive"

2. Open Private Position Form:
   - Input fields: Position Size (SOL), Direction (Long/Short), Leverage, Entry Price (USD)
   - Submit button: "🔒 Open Private Position"
   - On submit: Encrypt position data, show privacy indicator, display encrypted data in dark code box
   - Show what's private (size, direction, leverage, entry price) vs what's public (hash, status, timestamp)

3. Check Position Status Section:
   - Button: "📊 Check PnL" - calculates and displays profit/loss while keeping position details private
   - Button: "⚠️ Check Liquidation Risk" - shows private health check results
   - Results in dark code-style boxes showing public PnL but private position details

4. Privacy Information Box:
   - Yellow background with left border
   - Explains: Private Positions, Private Orders, Private Liquidation Checks, Public PnL

5. Link Section:
   - Green background
   - Link to GitHub repository

Make it fully functional with React hooks:
- useState for form data and results
- Encrypt function (simulate with base64 encoding)
- Hash generation function
- PnL calculation based on random price changes
- Liquidation health check simulation

Use Tailwind CSS for styling with:
- Gradient backgrounds
- Rounded corners
- Shadow effects
- Hover animations
- Responsive design
```

## Option 3: Direct Code Import

The full React component code is in `v0-component.tsx` - copy and paste that entire file into V0.dev

## What V0 Will Generate

V0 will create:
- ✅ Fully functional React component
- ✅ Interactive form with validation
- ✅ Real-time encryption simulation
- ✅ PnL calculator
- ✅ Liquidation checker
- ✅ Privacy indicators
- ✅ Modern, responsive UI

## After V0 Generates

1. Copy the generated code
2. Deploy to Vercel/Netlify
3. Get your live demo URL
4. Use that URL for Arcium RTG submission!
