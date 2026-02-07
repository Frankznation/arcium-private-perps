import { TwitterApi } from 'twitter-api-v2';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { retry, sleep } from '../utils/helpers';

let twitterClient: TwitterApi | null = null;

function hasTwitterConfig(): boolean {
  return Boolean(
    config.twitter.apiKey &&
    config.twitter.apiSecret &&
    config.twitter.accessToken &&
    config.twitter.accessSecret
  );
}

/**
 * Initialize Twitter client
 */
function getTwitterClient(): TwitterApi {
  if (!hasTwitterConfig()) {
    throw new Error('Twitter API credentials not configured');
  }
  if (!twitterClient) {
    twitterClient = new TwitterApi({
      appKey: config.twitter.apiKey,
      appSecret: config.twitter.apiSecret,
      accessToken: config.twitter.accessToken,
      accessSecret: config.twitter.accessSecret,
    });
  }
  return twitterClient;
}

/**
 * Post a tweet
 */
export async function postTweet(content: string): Promise<string> {
  logger.info('Posting tweet...');
  
  try {
    if (!hasTwitterConfig()) {
      logger.warn('Twitter not configured, skipping tweet');
      return '';
    }
    const client = getTwitterClient();
    const tweet = await retry(async () => {
      return await client.v2.tweet(content);
    });

    logger.info(`Tweet posted: ${tweet.data.id}`);
    return tweet.data.id;
  } catch (error) {
    logger.error(`Failed to post tweet: ${error}`);
    throw error;
  }
}

/**
 * Reply to a tweet
 */
export async function replyToTweet(tweetId: string, content: string): Promise<string> {
  logger.info(`Replying to tweet ${tweetId}...`);
  
  try {
    if (!hasTwitterConfig()) {
      logger.warn('Twitter not configured, skipping reply');
      return '';
    }
    const client = getTwitterClient();
    const reply = await retry(async () => {
      return await client.v2.reply(content, tweetId);
    });

    logger.info(`Reply posted: ${reply.data.id}`);
    return reply.data.id;
  } catch (error) {
    logger.error(`Failed to reply to tweet: ${error}`);
    throw error;
  }
}

/**
 * Fetch mentions
 */
export async function fetchMentions(sinceId?: string): Promise<Array<{
  id: string;
  text: string;
  author: string;
  createdAt: Date;
}>> {
  logger.debug('Fetching mentions...');
  
  try {
    if (!hasTwitterConfig()) {
      return [];
    }
    const client = getTwitterClient();
    const me = await client.v2.me();
    void me.data.id;

    const mentions = await retry(async () => {
      const response = await client.v2.search(`@${me.data.username}`, {
        max_results: 10,
        since_id: sinceId,
        'tweet.fields': ['created_at', 'author_id'],
      });

      return response.data.data || [];
    });

    const results = mentions.map((tweet) => ({
      id: tweet.id,
      text: tweet.text,
      author: tweet.author_id || 'unknown',
      createdAt: new Date(tweet.created_at || Date.now()),
    }));

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
let lastTweetTime = 0;
const MIN_TWEET_INTERVAL = 60000; // 1 minute

export async function postTweetWithRateLimit(content: string): Promise<string> {
  const now = Date.now();
  const timeSinceLastTweet = now - lastTweetTime;

  if (timeSinceLastTweet < MIN_TWEET_INTERVAL) {
    const waitTime = MIN_TWEET_INTERVAL - timeSinceLastTweet;
    logger.debug(`Rate limiting: waiting ${waitTime}ms`);
    await sleep(waitTime);
  }

  lastTweetTime = Date.now();
  return postTweet(content);
}
