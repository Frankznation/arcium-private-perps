import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { retry } from '../utils/helpers';
import { generateTradingPrompt, generateReplyPrompt, type AIAnalysis } from './prompts';

const anthropic = new Anthropic({
  apiKey: config.anthropicApiKey,
});

// Zod schema for AI response validation
const TradeDecisionSchema = z.object({
  action: z.enum(['BUY', 'SELL', 'HOLD']),
  marketId: z.string(),
  marketName: z.string(),
  position: z.enum(['YES', 'NO']),
  amountEth: z.number().min(0.001).max(0.1),
  reasoning: z.string(),
  confidence: z.number().min(0).max(100),
});

const AIAnalysisSchema = z.object({
  decisions: z.array(TradeDecisionSchema),
  marketCommentary: z.string(),
  portfolioRecommendation: z.string(),
  riskAssessment: z.string(),
});

/**
 * Analyze markets and generate trading decisions
 */
export async function analyzeMarkets(
  portfolioValue: number,
  openPositions: Array<{
    marketId: string;
    marketName: string;
    position: 'YES' | 'NO';
    entryPrice: number;
    currentPrice: number;
    pnlBps: number;
  }>,
  availableMarkets: Array<{
    id: string;
    name: string;
    yesPrice: number;
    noPrice: number;
    volume24h: number;
  }>,
  recentNews?: string[]
): Promise<AIAnalysis> {
  logger.info('Analyzing markets with AI...');

  const prompt = generateTradingPrompt(portfolioValue, openPositions, availableMarkets, recentNews);

  try {
    const response = await retry(async () => {
      const msg = await anthropic.messages.create({
        model: config.anthropicModel,
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = msg.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      return content.text;
    });

    // Parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const normalized = normalizeAnalysis(parsed);
    const validated = AIAnalysisSchema.parse(normalized);

    logger.info(`AI generated ${validated.decisions.length} trading decisions`);
    return validated;
  } catch (error) {
    logger.error(`AI analysis failed: ${error}`);
    
    // Return safe fallback
    return {
      decisions: [],
      marketCommentary: 'Taking a cautious approach today. Markets are volatile, so I\'m holding my claws steady.',
      portfolioRecommendation: 'Maintaining current positions',
      riskAssessment: 'MEDIUM',
    };
  }
}

function normalizeAnalysis(raw: any): any {
  if (!raw || typeof raw !== 'object') {
    return raw;
  }

  if (Array.isArray(raw.decisions)) {
    raw.decisions = raw.decisions.map((decision: any) => ({
      ...decision,
      amountEth: clampAmountEth(decision?.amountEth),
    }));
  }

  return raw;
}

function clampAmountEth(value: unknown): number {
  const amount = typeof value === 'number' && Number.isFinite(value) ? value : 0.001;
  if (amount < 0.001) return 0.001;
  if (amount > 0.1) return 0.1;
  return amount;
}

/**
 * Generate social media reply
 */
export async function generateReply(
  mention: string,
  context?: {
    recentTrades?: string[];
    portfolioValue?: number;
  }
): Promise<string> {
  logger.debug('Generating AI reply...');

  const prompt = generateReplyPrompt(mention, context);

  try {
    const response = await retry(async () => {
      const msg = await anthropic.messages.create({
        model: config.anthropicModel,
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = msg.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      return content.text;
    });

    return response.trim();
  } catch (error) {
    logger.error(`Reply generation failed: ${error}`);
    return 'Thanks for the mention! 🦀 I\'m an autonomous trading agent on Base. Always DYOR!';
  }
}
