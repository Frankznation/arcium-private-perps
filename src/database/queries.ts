import { getDatabaseClient } from './client';
import { logger } from '../utils/logger';

export interface Trade {
  id: string;
  market_id: string;
  market_name: string;
  position: 'YES' | 'NO';
  amount_eth?: number;
  amount_usd?: number;
  entry_price: number;
  entry_tx_hash: string;
  entry_timestamp: Date;
  exit_price?: number;
  exit_tx_hash?: string;
  exit_timestamp?: Date;
  pnl_bps?: number;
  status: 'OPEN' | 'CLOSED' | 'CANCELLED';
  nft_token_id?: number;
}

export interface PortfolioSnapshot {
  id: string;
  timestamp: Date;
  total_value_eth: number;
  open_positions_count: number;
  daily_pnl_bps: number;
}

export interface SocialPost {
  id: string;
  platform: 'TWITTER' | 'FARCASTER';
  post_id: string;
  content: string;
  post_type: 'TRADE_ENTRY' | 'TRADE_EXIT' | 'NFT_MINT' | 'DAILY_SUMMARY' | 'REPLY' | 'LAUNCH';
  related_trade_id?: string;
  timestamp: Date;
}

export interface Mention {
  id: string;
  platform: 'TWITTER' | 'FARCASTER';
  mention_id: string;
  author: string;
  content: string;
  replied: boolean;
  reply_id?: string;
  timestamp: Date;
}

/**
 * Create a new trade
 */
export async function createTrade(trade: Omit<Trade, 'id'>): Promise<Trade> {
  const supabase = getDatabaseClient() as any;
  
  const { data, error } = await supabase
    .from('trades')
    .insert({
      market_id: trade.market_id,
      market_name: trade.market_name,
      position: trade.position,
      amount_eth: trade.amount_eth,
      amount_usd: trade.amount_usd,
      entry_price: trade.entry_price,
      entry_tx_hash: trade.entry_tx_hash,
      entry_timestamp: trade.entry_timestamp.toISOString(),
      status: trade.status,
    })
    .select()
    .single();

  if (error) {
    logger.error(`Failed to create trade: ${error.message}`);
    throw error;
  }

  const row = data as any;
  return {
    ...row,
    entry_timestamp: new Date(row.entry_timestamp),
    exit_timestamp: row.exit_timestamp ? new Date(row.exit_timestamp) : undefined,
  } as Trade;
}

/**
 * Update trade (e.g., close position)
 */
export async function updateTrade(
  tradeId: string,
  updates: Partial<Pick<Trade, 'exit_price' | 'exit_tx_hash' | 'exit_timestamp' | 'pnl_bps' | 'status' | 'nft_token_id'>>
): Promise<Trade> {
  const supabase = getDatabaseClient() as any;
  
  const updateData: any = {};
  if (updates.exit_price !== undefined) updateData.exit_price = updates.exit_price;
  if (updates.exit_tx_hash) updateData.exit_tx_hash = updates.exit_tx_hash;
  if (updates.exit_timestamp) updateData.exit_timestamp = updates.exit_timestamp.toISOString();
  if (updates.pnl_bps !== undefined) updateData.pnl_bps = updates.pnl_bps;
  if (updates.status) updateData.status = updates.status;
  if (updates.nft_token_id !== undefined) updateData.nft_token_id = updates.nft_token_id;

  const { data, error } = await supabase
    .from('trades')
    .update(updateData)
    .eq('id', tradeId)
    .select()
    .single();

  if (error) {
    logger.error(`Failed to update trade: ${error.message}`);
    throw error;
  }

  const row = data as any;
  return {
    ...row,
    entry_timestamp: new Date(row.entry_timestamp),
    exit_timestamp: row.exit_timestamp ? new Date(row.exit_timestamp) : undefined,
  } as Trade;
}

/**
 * Get open trades
 */
export async function getOpenTrades(): Promise<Trade[]> {
  const supabase = getDatabaseClient() as any;
  
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('status', 'OPEN')
    .order('entry_timestamp', { ascending: false });

  if (error) {
    logger.error(`Failed to fetch open trades: ${error.message}`);
    return [];
  }

  return (data || []).map((t: any) => ({
    ...t,
    entry_timestamp: new Date(t.entry_timestamp),
    exit_timestamp: t.exit_timestamp ? new Date(t.exit_timestamp) : undefined,
  })) as Trade[];
}

/**
 * Get all trades
 */
export async function getAllTrades(limit: number = 100): Promise<Trade[]> {
  const supabase = getDatabaseClient() as any;
  
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .order('entry_timestamp', { ascending: false })
    .limit(limit);

  if (error) {
    logger.error(`Failed to fetch trades: ${error.message}`);
    return [];
  }

  return (data || []).map((t: any) => ({
    ...t,
    entry_timestamp: new Date(t.entry_timestamp),
    exit_timestamp: t.exit_timestamp ? new Date(t.exit_timestamp) : undefined,
  })) as Trade[];
}

/**
 * Create portfolio snapshot
 */
export async function createPortfolioSnapshot(snapshot: Omit<PortfolioSnapshot, 'id'>): Promise<PortfolioSnapshot> {
  const supabase = getDatabaseClient() as any;
  
  const { data, error } = await supabase
    .from('portfolio_snapshots')
    .insert({
      timestamp: snapshot.timestamp.toISOString(),
      total_value_eth: snapshot.total_value_eth,
      open_positions_count: snapshot.open_positions_count,
      daily_pnl_bps: snapshot.daily_pnl_bps,
    })
    .select()
    .single();

  if (error) {
    logger.error(`Failed to create snapshot: ${error.message}`);
    throw error;
  }

  const row = data as any;
  return {
    ...row,
    timestamp: new Date(row.timestamp),
  } as PortfolioSnapshot;
}

/**
 * Record social post
 */
export async function recordSocialPost(post: Omit<SocialPost, 'id'>): Promise<SocialPost> {
  const supabase = getDatabaseClient() as any;
  
  const { data, error } = await supabase
    .from('social_posts')
    .insert({
      platform: post.platform,
      post_id: post.post_id,
      content: post.content,
      post_type: post.post_type,
      related_trade_id: post.related_trade_id,
      timestamp: post.timestamp.toISOString(),
    })
    .select()
    .single();

  if (error) {
    logger.error(`Failed to record social post: ${error.message}`);
    throw error;
  }

  const row = data as any;
  return {
    ...row,
    timestamp: new Date(row.timestamp),
  } as SocialPost;
}

/**
 * Record mention
 */
export async function recordMention(mention: Omit<Mention, 'id'>): Promise<Mention> {
  const supabase = getDatabaseClient() as any;
  
  const { data, error } = await supabase
    .from('mentions')
    .insert({
      platform: mention.platform,
      mention_id: mention.mention_id,
      author: mention.author,
      content: mention.content,
      replied: mention.replied,
      reply_id: mention.reply_id,
      timestamp: mention.timestamp.toISOString(),
    })
    .select()
    .single();

  if (error) {
    logger.error(`Failed to record mention: ${error.message}`);
    throw error;
  }

  const row = data as any;
  return {
    ...row,
    timestamp: new Date(row.timestamp),
  } as Mention;
}

/**
 * Get unprocessed mentions
 */
export async function getUnprocessedMentions(): Promise<Mention[]> {
  const supabase = getDatabaseClient() as any;
  
  const { data, error } = await supabase
    .from('mentions')
    .select('*')
    .eq('replied', false)
    .order('timestamp', { ascending: true });

  if (error) {
    logger.error(`Failed to fetch mentions: ${error.message}`);
    return [];
  }

  return (data || []).map((m: any) => ({
    ...m,
    timestamp: new Date(m.timestamp),
  })) as Mention[];
}

/**
 * Mark mention as replied
 */
export async function markMentionReplied(mentionId: string, replyId: string): Promise<void> {
  const supabase = getDatabaseClient() as any;
  
  const { error } = await supabase
    .from('mentions')
    .update({ replied: true, reply_id: replyId })
    .eq('id', mentionId);

  if (error) {
    logger.error(`Failed to mark mention as replied: ${error.message}`);
    throw error;
  }
}
