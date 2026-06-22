// rssFeeds.ts — shared RSS feed storage, parsing, and per-feed host permission helpers.
// Used by both RssFeedManager (settings) and NewsSection (home dashboard) so the two
// stay in sync via the same storage key and the same parse logic.

export const FEEDS_KEY = 'browsermain_rss_feeds';

export interface RssFeed {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  builtin?: boolean;
}

export interface NewsItem {
  id: string;
  title: string;
  url: string;
  rank: number;
}

export interface NewsGroup {
  platform: string;
  items: NewsItem[];
  /** When true, the feed failed to load — render an error card instead of items. */
  error?: boolean;
}

const DEFAULT_FEED_URL = 'https://momoyu.cc/api/hot/rss?code=MSwyLDMsNjksNDcsNTAsMTgsNzIsNDYsOTUsMzYsNjIsNjE=';

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

export function loadFeeds(): Promise<RssFeed[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get(FEEDS_KEY, (result) => {
      const feeds = result[FEEDS_KEY] as RssFeed[] | undefined;
      if (Array.isArray(feeds) && feeds.length > 0) {
        resolve(feeds);
        return;
      }
      resolve([
        { id: 'builtin-momoyu', name: 'Momoyu Hot', url: DEFAULT_FEED_URL, enabled: true, builtin: true },
      ]);
    });
  });
}

export function saveFeeds(feeds: RssFeed[]): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [FEEDS_KEY]: feeds }, resolve);
  });
}

// ---------------------------------------------------------------------------
// Per-feed host permission (MV3 optional_host_permissions)
// Standard RSS feeds are cross-origin; the user grants each origin on demand so the
// background FETCH_RSS can read the response. Only http/https origins are requested.
// ---------------------------------------------------------------------------

export function feedOriginPattern(url: string): string {
  try {
    return new URL(url).origin + '/*';
  } catch {
    return '';
  }
}

export function requestFeedPermission(url: string): Promise<boolean> {
  const origin = feedOriginPattern(url);
  if (!origin) return Promise.resolve(false);
  return new Promise((resolve) => {
    chrome.permissions.request({ origins: [origin] }, (granted: boolean) => {
      //chrome.runtime.lastError is set if the call isn't in a user gesture, etc.
      resolve(!!granted);
    });
  });
}

export function removeFeedPermission(url: string): Promise<void> {
  const origin = feedOriginPattern(url);
  if (!origin) return Promise.resolve();
  return new Promise((resolve) => {
    chrome.permissions.remove({ origins: [origin] }, () => resolve());
  });
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/**
 * Parse the built-in Momoyu aggregator feed. Its single <description> holds HTML
 * with multiple <h2> platform headings and ranked <p><a> items — one card per platform.
 */
function parseMomoyuDescription(html: string): NewsGroup[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const groups: NewsGroup[] = [];
  let currentPlatform = '';
  let currentItems: NewsItem[] = [];

  const walk = doc.body.childNodes;
  for (let i = 0; i < walk.length; i++) {
    const node = walk[i] as HTMLElement;
    if (node.nodeName === 'H2') {
      if (currentPlatform && currentItems.length > 0) {
        groups.push({ platform: currentPlatform, items: currentItems });
      }
      currentPlatform = node.textContent?.trim() || '';
      currentItems = [];
    } else if (node.nodeName === 'P' && currentPlatform) {
      const anchor = node.querySelector('a');
      if (anchor) {
        const raw = anchor.textContent?.trim() || '';
        const match = raw.match(/^(\d+)\.\s*(.*)/);
        if (match) {
          currentItems.push({
            id: `${currentPlatform}-${match[1]}`,
            title: match[2],
            url: anchor.getAttribute('href') || '#',
            rank: parseInt(match[1], 10),
          });
        }
      }
    }
  }
  if (currentPlatform && currentItems.length > 0) {
    groups.push({ platform: currentPlatform, items: currentItems });
  }
  return groups;
}

export function parseMomoyuAggregator(xml: string): NewsGroup[] {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const items = doc.querySelectorAll('item');
  if (items.length === 0) throw new Error('No RSS items found');
  const description = items[0].querySelector('description')?.textContent || '';
  return parseMomoyuDescription(description);
}

/**
 * Parse a standard RSS 2.0 (<item>) or Atom (<entry>) feed into a single card.
 * Display count is capped by the renderer, not here.
 */
export function parseStandardFeed(xml: string, name: string): NewsGroup {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');

  let entries: { title: string; url: string }[] = [];
  const rssItems = Array.from(doc.querySelectorAll('item'));
  if (rssItems.length > 0) {
    entries = rssItems.map((item) => ({
      title: item.querySelector('title')?.textContent?.trim() || '',
      url: item.querySelector('link')?.textContent?.trim() || '',
    }));
  } else {
    entries = Array.from(doc.querySelectorAll('entry')).map((entry) => {
      const linkEl = entry.querySelector('link');
      const href = linkEl?.getAttribute('href') || linkEl?.textContent?.trim() || '';
      return {
        title: entry.querySelector('title')?.textContent?.trim() || '',
        url: href,
      };
    });
  }

  const items: NewsItem[] = entries
    .filter((e) => e.title)
    .map((e, i) => ({ id: `${name}-${i}`, title: e.title, url: e.url || '#', rank: i + 1 }));

  if (items.length === 0) {
    throw new Error(doc.querySelector('parsererror') ? 'Invalid feed XML' : 'No items found in feed');
  }
  return { platform: name, items };
}

/**
 * Fetch one feed via the background FETCH_RSS bridge and parse it.
 * Built-in feeds use the Momoyu aggregator parser (multiple cards); all others use
 * the standard parser (one card). Throws on fetch or parse failure.
 */
export async function fetchFeedGroups(feed: RssFeed): Promise<NewsGroup[]> {
  const response: { success: boolean; xml?: string; error?: string } = await chrome.runtime.sendMessage({
    type: 'FETCH_RSS',
    url: feed.url,
  });
  if (!response.success || !response.xml) {
    throw new Error(response.error || 'RSS fetch failed');
  }
  return feed.builtin ? parseMomoyuAggregator(response.xml) : [parseStandardFeed(response.xml, feed.name)];
}
