import { config } from '../config/env';
import { logger } from '../utils/logger';
import { retry } from '../utils/helpers';

export interface NewsHeadline {
  title: string;
  link?: string;
  source?: string;
}

function parseRssItems(xml: string): NewsHeadline[] {
  const items = xml.split('<item>').slice(1);
  const headlines: NewsHeadline[] = [];

  for (const item of items) {
    const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/i);
    const linkMatch = item.match(/<link>(.*?)<\/link>/i);
    const title = (titleMatch?.[1] || titleMatch?.[2] || '').trim();
    const link = linkMatch?.[1]?.trim();

    if (title) {
      headlines.push({ title, link });
    }
  }

  return headlines;
}

export async function fetchNewsHeadlines(limit = 5): Promise<NewsHeadline[]> {
  if (!config.newsFeeds.length) {
    return [];
  }

  const headlines: NewsHeadline[] = [];

  for (const feedUrl of config.newsFeeds) {
    try {
      const xml = await retry(async () => {
        const res = await fetch(feedUrl, { method: 'GET' });
        if (!res.ok) {
          throw new Error(`News feed error: ${res.status}`);
        }
        return await res.text();
      });

      const feedHeadlines = parseRssItems(xml).slice(0, limit);
      headlines.push(...feedHeadlines);
    } catch (error) {
      logger.warn(`Failed to fetch news from ${feedUrl}: ${error}`);
    }
  }

  return headlines.slice(0, limit);
}
