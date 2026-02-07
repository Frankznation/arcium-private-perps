import { getBasescanUrl } from '../utils/helpers';
import { formatBps, formatEth } from '../utils/helpers';

export type SocialPlatform = 'TWITTER' | 'FARCASTER';

export interface TradeEntryPost {
  marketName: string;
  position: 'YES' | 'NO';
  amountEth: number;
  price: number;
  txHash: string;
  reasoning: string;
  confidence: number;
  timestamp: number;
}

export interface TradeExitPost {
  marketName: string;
  position: 'YES' | 'NO';
  entryPrice: number;
  exitPrice: number;
  pnlBps: number;
  amountEth: number;
  txHash: string;
  timestamp: number;
  exitReason: string;
}

export interface NFTPost {
  marketName: string;
  pnlBps: number;
  tokenId: number;
  txHash: string;
  timestamp: number;
}

export interface MarketReflectionPost {
  commentary: string;
  riskAssessment: string;
  portfolioRecommendation: string;
  timestamp: number;
}

export interface LaunchPost {
  walletAddress: string;
}

export interface RoundSummaryPost {
  portfolioEth: number;
  openPositions: number;
  marketsScanned: number;
  decisionsCount: number;
  tradesExecuted: number;
  hasCommentary: boolean;
}

/**
 * Generate per-round summary so feed has constant updates
 */
export function generateRoundSummaryForPlatform(
  params: RoundSummaryPost,
  platform: SocialPlatform
): string {
  const eth = params.portfolioEth.toFixed(4);
  const op = params.openPositions;
  const ms = params.marketsScanned;
  const dc = params.decisionsCount;
  const te = params.tradesExecuted;

  const farcasterBody = `🦀 Round complete

Portfolio: ${eth} ETH
Open: ${op} | Markets: ${ms}

Decisions: ${dc} | Executed: ${te}

${params.hasCommentary ? 'Commentary posted above.' : 'No trade this round — claws steady.'}`;

  const classicBody = `🦀 CrabTrader round | ${eth} ETH | ${op} open | ${te} executed this round. #Base`;
  return platform === 'FARCASTER' ? farcasterBody : trimForPlatform(classicBody, platform);
}

/**
 * Generate trade entry post
 */
export function generateTradeEntryPost(params: TradeEntryPost): string {
  return generateTradeEntryPostForPlatform(params, 'FARCASTER');
}

export function generateTradeEntryPostForPlatform(
  params: TradeEntryPost,
  platform: SocialPlatform
): string {
  const pricePercent = (params.price / 100).toFixed(2);
  const txUrl = getBasescanUrl(params.txHash);
  const confidencePercent = Math.round(params.confidence);
  const shortReason = params.reasoning.trim();
  void params.timestamp;

  const farcasterBody = `🦀 CRABTRADER ENTRY

📊 Market: ${params.marketName}

🎯 Stance: ${params.position} @ ${pricePercent}%

💰 Size: ${formatEth(params.amountEth)}

🚀 Conviction: ${confidencePercent}% 

${shortReason}

Tx: ${txUrl}

The crab commits, but keeps a claw on risk.`;

  const classicBody = `🦀 New position opened!

Market: ${params.marketName}
Position: ${params.position}
Entry: ${pricePercent}%
Size: ${formatEth(params.amountEth)}

${txUrl}

#Base #OnChain #CrabTrader

(I'm an autonomous AI agent - always DYOR!)`;

  const body = platform === 'FARCASTER' ? farcasterBody : classicBody;
  return trimForPlatform(body, platform);
}

/**
 * Generate trade exit post
 */
export function generateTradeExitPost(params: TradeExitPost): string {
  return generateTradeExitPostForPlatform(params, 'FARCASTER');
}

export function generateTradeExitPostForPlatform(
  params: TradeExitPost,
  platform: SocialPlatform
): string {
  const entryPercent = (params.entryPrice / 100).toFixed(2);
  const exitPercent = (params.exitPrice / 100).toFixed(2);
  const pnl = formatBps(params.pnlBps);
  const txUrl = getBasescanUrl(params.txHash);

  const isWin = params.pnlBps > 0;
  const winLossEmoji = isWin ? '💰' : '⚠️';
  const outcome = isWin ? 'WIN' : 'LOSS';

  const farcasterBody = `🦀 CRABTRADER EXIT ${winLossEmoji}

📊 Market: ${params.marketName}

🎯 Stance: ${params.position}

Entry → Exit: ${entryPercent}% → ${exitPercent}%

P&L: ${outcome} ${pnl}

💰 Size: ${formatEth(params.amountEth)}

Reason: ${params.exitReason}

Tx: ${txUrl}

Crab lesson: tighten the claws, keep the edge.`;

  const classicBody = `🦀 Position closed
Market: ${params.marketName}
Entry: ${entryPercent}% → Exit: ${exitPercent}%
P&L: ${pnl}
Size: ${formatEth(params.amountEth)}
Reason: ${params.exitReason}
Time: ${formatTimestampUtc(params.timestamp)}
Tx: ${txUrl}`;

  const body = platform === 'FARCASTER' ? farcasterBody : classicBody;
  return trimForPlatform(body, platform);
}

/**
 * Generate NFT mint post
 */
export function generateNFTPost(params: NFTPost): string {
  return generateNFTPostForPlatform(params, 'FARCASTER');
}

export function generateNFTPostForPlatform(
  params: NFTPost,
  platform: SocialPlatform
): string {
  const pnl = formatBps(params.pnlBps);
  const emoji = params.pnlBps > 0 ? '🎉' : '💥';
  const txUrl = getBasescanUrl(params.txHash);

  const reflection = params.pnlBps > 0
    ? 'Logging the win and the lessons.'
    : 'Logging the loss so I can tighten the claws next time.';

  const body = `${emoji} Trade NFT minted

Market: ${params.marketName}
P&L: ${pnl}

Token: #${params.tokenId}
Time: ${formatTimestampUtc(params.timestamp)}
Tx: ${txUrl}

Note: ${reflection}`;

  return trimForPlatform(body, platform);
}

/**
 * Generate daily summary post
 */
export function generateDailySummary(params: {
  totalValue: number;
  dailyPnlBps: number;
  tradesToday: number;
  openPositions: number;
}): string {
  return generateDailySummaryForPlatform(params, 'FARCASTER');
}

export function generateDailySummaryForPlatform(
  params: {
    totalValue: number;
    dailyPnlBps: number;
    tradesToday: number;
    openPositions: number;
  },
  platform: SocialPlatform
): string {
  const pnl = formatBps(params.dailyPnlBps);
  const emoji = params.dailyPnlBps > 0 ? '💰' : params.dailyPnlBps < 0 ? '⚠️' : '➡️';
  const pnlLabel = params.dailyPnlBps > 0 ? 'UP' : params.dailyPnlBps < 0 ? 'DOWN' : 'FLAT';

  const farcasterBody = `🦀 CRABTRADER DAILY ${emoji}

📊 Portfolio: ${formatEth(params.totalValue)}

💰 P&L: ${pnlLabel} ${pnl}

🎯 Trades: ${params.tradesToday} | Open: ${params.openPositions}

Stance: Steady claws, controlled risk.`;

  const classicBody = `🦀 Daily check-in ${emoji}
Portfolio: ${formatEth(params.totalValue)}
Daily P&L: ${pnl}
Trades: ${params.tradesToday} | Open: ${params.openPositions}
Reflection: Stayed within risk limits and kept exposure measured.`;

  const body = platform === 'FARCASTER' ? farcasterBody : classicBody;
  return trimForPlatform(body, platform);
}

/**
 * Generate market commentary post
 */
export function generateCommentaryPost(commentary: string): string {
  return generateCommentaryPostForPlatform(commentary, 'FARCASTER');
}

export function generateCommentaryPostForPlatform(
  commentary: string,
  platform: SocialPlatform
): string {
  const body = `🦀 ${commentary}`;
  return trimForPlatform(body, platform);
}

export function generateMarketReflectionPostForPlatform(
  params: MarketReflectionPost,
  platform: SocialPlatform
): string {
  const farcasterBody = `🦀 CRABTRADER MARKET UPDATE

📊 Signal:
${params.commentary}

⚠️ Risk Level: ${params.riskAssessment}

🎯 Stance:
${params.portfolioRecommendation}

The crab reads the tide, not the noise.`;

  const classicBody = `Market reflection (autonomous)
Signal: ${params.commentary}
Risk: ${params.riskAssessment}
Stance: ${params.portfolioRecommendation}
Time: ${formatTimestampUtc(params.timestamp)}`;

  const body = platform === 'FARCASTER' ? farcasterBody : classicBody;
  return trimForPlatform(body, platform);
}

export function generateLaunchPostForPlatform(
  params: LaunchPost,
  platform: SocialPlatform
): string {
  const body = `🦀 CrabDAO Agent is now online and building on @base!

Wallet: ${params.walletAddress}

I'm an autonomous AI agent that:
• Deploys tokens & NFTs
• Engages with the community
• Builds onchain 24/7

Let's go! 🔵`;

  return trimForPlatform(body, platform);
}

function formatTimestampUtc(timestamp: number): string {
  const iso = new Date(timestamp).toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}

function trimForPlatform(text: string, platform: SocialPlatform): string {
  if (platform !== 'TWITTER') {
    // Farcaster and others: don't trim, allow full text
    return text;
  }

  const max = 275;
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max - 1)}…`;
}
