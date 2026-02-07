import { mintTradeNft, checkNotableTrade } from '../blockchain/contracts';
import { updateTrade } from '../database/queries';
import { logger } from '../utils/logger';
import { config } from '../config/env';
import type { Trade } from '../database/queries';
import { generateNFTPostForPlatform } from '../social/templates';
import { postTweetWithRateLimit } from '../social/twitter';
import { postCastWithRateLimit } from '../social/farcaster';
import { recordSocialPost } from '../database/queries';

/**
 * Check if a closed trade should have an NFT minted
 */
export async function shouldMintNFT(trade: Trade): Promise<boolean> {
  if (trade.status !== 'CLOSED' || !trade.pnl_bps) {
    return false;
  }

  // Check if already minted
  if (trade.nft_token_id) {
    return false;
  }

  // Check if notable using contract
  try {
    const isNotable = await checkNotableTrade(trade.pnl_bps);
    return isNotable;
  } catch (error) {
    logger.error(`Failed to check notable trade: ${error}`);
    // Fallback to local check
    return Math.abs(trade.pnl_bps) >= config.notableTradeThresholdBps;
  }
}

/**
 * Mint NFT for a notable trade
 */
export async function mintNFTForTrade(trade: Trade): Promise<void> {
  if (!trade.exit_price || !trade.pnl_bps) {
    throw new Error('Trade must be closed with P&L to mint NFT');
  }

  logger.info(`Minting NFT for trade: ${trade.market_name} (P&L: ${trade.pnl_bps} bps)`);

  try {
    // Generate commentary
    const commentary = trade.pnl_bps > 0
      ? `Big win on ${trade.market_name}! Clawed my way to ${(trade.pnl_bps / 100).toFixed(2)}% profit. 🦀💰`
      : `Got pinched on ${trade.market_name}. Lost ${(Math.abs(trade.pnl_bps) / 100).toFixed(2)}% but still learning. 🦀📉`;

    // Mint NFT
    const { tokenId, txHash } = await mintTradeNft({
      market: trade.market_name,
      position: trade.position,
      entryPrice: trade.entry_price,
      exitPrice: trade.exit_price,
      pnlBps: trade.pnl_bps,
      commentary,
    });

    // Update trade with NFT token ID
    await updateTrade(trade.id, {
      nft_token_id: Number(tokenId),
    });

    // Post to social media
    const postParams = {
      marketName: trade.market_name,
      pnlBps: trade.pnl_bps,
      tokenId: Number(tokenId),
      txHash,
      timestamp: Date.now(),
    };

    try {
      const tweetContent = generateNFTPostForPlatform(postParams, 'TWITTER');
      const tweetId = await postTweetWithRateLimit(tweetContent);
      if (tweetId) {
        await recordSocialPost({
          platform: 'TWITTER',
          post_id: tweetId,
          content: tweetContent,
          post_type: 'NFT_MINT',
          related_trade_id: trade.id,
          timestamp: new Date(),
        });
      }
    } catch (error) {
      logger.error(`Failed to post NFT tweet: ${error}`);
    }

    try {
      const castContent = generateNFTPostForPlatform(postParams, 'FARCASTER');
      const castHash = await postCastWithRateLimit(castContent);
      await recordSocialPost({
        platform: 'FARCASTER',
        post_id: castHash,
        content: castContent,
        post_type: 'NFT_MINT',
        related_trade_id: trade.id,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error(`Failed to post NFT cast: ${error}`);
    }

    logger.info(`NFT minted successfully: Token ID ${tokenId}`);
  } catch (error) {
    logger.error(`Failed to mint NFT: ${error}`);
    throw error;
  }
}

/**
 * Process all closed trades and mint NFTs for notable ones
 */
export async function processNotableTrades(): Promise<void> {
  logger.info('Checking for notable trades to mint NFTs...');

  const { getAllTrades } = await import('../database/queries');
  const allTrades = await getAllTrades(100);
  logger.debug(`Found ${allTrades.length} total trades in database`);

  const closedTrades = allTrades.filter((t) => t.status === 'CLOSED' && !t.nft_token_id);
  logger.info(`Found ${closedTrades.length} closed trades without NFTs`);

  if (closedTrades.length === 0) {
    logger.debug('No closed trades to process for NFTs');
    return;
  }

  let minted = 0;
  for (const trade of closedTrades) {
    try {
      const shouldMint = await shouldMintNFT(trade);
      logger.debug(`Trade ${trade.id} (${trade.market_name}, P&L: ${trade.pnl_bps}bps): ${shouldMint ? 'NOTABLE - will mint' : 'not notable'}`);
      if (shouldMint) {
        await mintNFTForTrade(trade);
        minted++;
        // Rate limit between mints
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    } catch (error) {
      logger.error(`Failed to process trade ${trade.id}: ${error}`);
    }
  }
  logger.info(`NFT processing complete: ${minted} NFTs minted from ${closedTrades.length} closed trades`);
}
