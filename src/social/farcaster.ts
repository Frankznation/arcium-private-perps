import { NeynarAPIClient, Configuration } from '@neynar/nodejs-sdk';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { retry, sleep } from '../utils/helpers';

let neynarClient: NeynarAPIClient | null = null;

/**
 * Initialize Farcaster client
 */
function getFarcasterClient(): NeynarAPIClient {
  if (!neynarClient) {
    if (!config.farcaster.neynarApiKey) {
      throw new Error('NEYNAR_API_KEY is required for Farcaster integration');
    }
    const configuration = new Configuration({ apiKey: config.farcaster.neynarApiKey });
    neynarClient = new NeynarAPIClient(configuration);
  }
  return neynarClient;
}

/**
 * Post a cast
 */
export async function postCast(content: string): Promise<string> {
  logger.info('Posting cast...');
  
  if (!config.farcaster.signerUuid) {
    logger.warn('FARCASTER_SIGNER_UUID not set, skipping cast');
    return '';
  }

  try {
    const client = getFarcasterClient();
    const cast = await retry(async () => {
      return await client.publishCast({
        signerUuid: config.farcaster.signerUuid,
        text: content,
      });
    });

    const hash = (cast as any)?.cast?.hash || '';
    logger.info(`Cast posted: ${hash}`);
    return hash;
  } catch (error) {
    logger.error(`Failed to post cast: ${error}`);
    throw error;
  }
}

/**
 * Reply to a cast
 */
export async function replyToCast(castHash: string, content: string): Promise<string> {
  logger.info(`Replying to cast ${castHash}...`);
  
  if (!config.farcaster.signerUuid) {
    logger.warn('FARCASTER_SIGNER_UUID not set, skipping reply');
    return '';
  }

  try {
    const client = getFarcasterClient();
    const reply = await retry(async () => {
      return await client.publishCast({
        signerUuid: config.farcaster.signerUuid,
        text: content,
        parent: castHash,
      });
    });

    const hash = (reply as any)?.cast?.hash || '';
    logger.info(`Reply posted: ${hash}`);
    return hash;
  } catch (error) {
    logger.error(`Failed to reply to cast: ${error}`);
    throw error;
  }
}

/**
 * Fetch mentions
 */
export async function fetchMentions(sinceTimestamp?: number): Promise<Array<{
  hash: string;
  text: string;
  author: string;
  timestamp: number;
}>> {
  logger.debug('Fetching Farcaster mentions...');
  
  if (!config.farcaster.signerUuid) {
    return [];
  }

  try {
    const client = getFarcasterClient();
    const signer = await client.lookupSigner({ signerUuid: config.farcaster.signerUuid });
    const fid = (signer as any)?.fid;

    if (!fid) {
      logger.warn('Could not resolve FID for signer');
      return [];
    }

    const notifications = await retry(async () => {
      return await client.fetchAllNotifications({
        fid,
        type: ['mention', 'reply'] as any,
        limit: 10,
      });
    });

    const results = (notifications as any)?.notifications
      ?.filter((n: any) => n.type === 'mention' || n.type === 'reply')
      .map((n: any) => ({
        hash: n.cast?.hash || '',
        text: n.cast?.text || '',
        author: n.cast?.author?.username || '',
        timestamp: n.cast?.timestamp ? new Date(n.cast.timestamp).getTime() : Date.now(),
      }))
      .filter((m: any) => !sinceTimestamp || m.timestamp > sinceTimestamp) || [];

    logger.debug(`Found ${results.length} mentions`);
    return results;
  } catch (error) {
    logger.error(`Failed to fetch mentions: ${error}`);
    return [];
  }
}

/**
 * Rate limiting helper
 */
let lastCastTime = 0;
const MIN_CAST_INTERVAL = 60000; // 1 minute

export async function postCastWithRateLimit(content: string): Promise<string> {
  const now = Date.now();
  const timeSinceLastCast = now - lastCastTime;

  if (timeSinceLastCast < MIN_CAST_INTERVAL) {
    const waitTime = MIN_CAST_INTERVAL - timeSinceLastCast;
    logger.debug(`Rate limiting: waiting ${waitTime}ms`);
    await sleep(waitTime);
  }

  lastCastTime = Date.now();
  return postCast(content);
}
