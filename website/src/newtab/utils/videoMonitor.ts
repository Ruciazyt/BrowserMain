// videoMonitor.ts — shared video keyword storage, RSS parsing, and
// fetch helpers for the 视频监控 (Video Monitor) tab.
//
// Why polling lives in the newtab page, not the background worker:
// MV3 service workers are evicted after ~30s of idle. A 2-hour timer in the
// SW would require `chrome.alarms` (new permission, new pattern not used
// elsewhere in this codebase). NewsSection.tsx already accepts the same
// trade-off for its 10-minute polling — when the tab is closed, no refresh
// fires. Users have a manual "Refresh now" button on the VideoMonitor tab
// for when they want fresh results on demand.

export const VIDEO_KEYWORDS_KEY = 'browsermain_video_keywords';

/** Default cap on videos returned per keyword per fetch. */
export const PER_KEYWORD_LIMIT = 10;

/** Default refresh cadence — overridden by `Settings.videoRefreshIntervalMs`. */
export const DEFAULT_REFRESH_MS = 2 * 60 * 60 * 1000;

/** Skip a keyword whose last successful fetch was less than this many ms ago.
 *  Prevents hammering the public RSSHub instance when the user reopens the tab
 *  moments after closing it, and prevents overlapping fetches when the user
 *  clicks "Refresh now" right after a polling tick. */
const MIN_REFRESH_GAP_MS = 4 * 60 * 1000;

/** Per-keyword stagger to avoid bursting concurrent requests at RSSHub. */
const FETCH_STAGGER_MS = 600;

const RSSHUB_BASE = 'https://rsshub.app';
const RSSHUB_ORIGIN_PATTERN = 'https://rsshub.app/*';
const MRSS_NS = 'http://search.yahoo.com/mrss/';

export interface VideoItem {
  /** Bilibili video id (e.g. "BV1xx411c7mD"). May be empty for legacy AV-only links. */
  bvid: string;
  title: string;
  /** Absolute URL to the cover image (hdslb.com CDN). May be empty. */
  thumbnail: string;
  author?: string;
  /** Raw pubDate string from the feed (not parsed). */
  pubDate?: string;
  /** Canonical bilibili.com/video/... link. Always set when title is set. */
  url: string;
}

export interface VideoKeyword {
  id: string;
  keyword: string;
  videos: VideoItem[];
  /** Epoch ms of last successful (or attempted) fetch. */
  lastFetched: number;
  /** Set when the most recent fetch failed; cleared on next success. */
  error?: string;
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

export function loadKeywords(): Promise<VideoKeyword[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get(VIDEO_KEYWORDS_KEY, (result) => {
      const kws = result[VIDEO_KEYWORDS_KEY] as VideoKeyword[] | undefined;
      if (Array.isArray(kws)) {
        resolve(kws);
        return;
      }
      resolve([]);
    });
  });
}

export function saveKeywords(kws: VideoKeyword[]): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [VIDEO_KEYWORDS_KEY]: kws }, resolve);
  });
}

// ---------------------------------------------------------------------------
// Host permission (MV3 optional_host_permissions)
//
// RSSHub's public instance is cross-origin; without an explicit grant, the
// background service worker's `fetch()` will fail with CORS. We request
// `https://rsshub.app/*` once per session on the first add (which is a user
// gesture) and cache the result so subsequent fetches and refreshes don't
// re-prompt. The manifest's `optional_host_permissions: ["https://*/*"]` means
// this is the only prompt we'll ever need for any RSSHub-hosted route.
// ---------------------------------------------------------------------------

let permissionGranted: boolean | null = null;

export async function ensureRssHubPermission(): Promise<boolean> {
  if (permissionGranted !== null) return permissionGranted;
  // Chrome will only show the permission prompt when called from a user gesture.
  // chrome.runtime.lastError is set if called outside one — treat as denied.
  return new Promise((resolve) => {
    chrome.permissions.request({ origins: [RSSHUB_ORIGIN_PATTERN] }, (granted) => {
      const ok = !!granted && !chrome.runtime.lastError;
      permissionGranted = ok;
      resolve(ok);
    });
  });
}

// ---------------------------------------------------------------------------
// Fetch + parse
// ---------------------------------------------------------------------------

function buildFeedUrl(keyword: string): string {
  return `${RSSHUB_BASE}/bilibili/search/keyword/${encodeURIComponent(keyword)}`;
}

function stripCData(s: string): string {
  return s.replace(/<!\[CDATA\[|\]\]>/g, '').trim();
}

function decodeXmlEntities(s: string): string {
  // DOMParser already decodes &amp;/&lt;/&gt; when reading .textContent; this is
  // here for safety against double-encoded payloads from older feeds.
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** Parse an RSS 2.0 XML payload from RSSHub's Bilibili search endpoint into
 *  a flat list of VideoItem. Defensive against minor feed-shape changes. */
function parseVideoFeed(xml: string, limit: number): VideoItem[] {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const items = Array.from(doc.querySelectorAll('item')).slice(0, limit);

  const parsed: VideoItem[] = items.map((item) => {
    const rawTitle = item.querySelector('title')?.textContent ?? '';
    const title = decodeXmlEntities(stripCData(rawTitle));

    const rawLink = stripCData(item.querySelector('link')?.textContent ?? '');
    const bvMatch = rawLink.match(/BV([a-zA-Z0-9]+)/);
    const bvid = bvMatch ? `BV${bvMatch[1]}` : '';

    // Namespace-aware lookup so `media:thumbnail` resolves regardless of
    // how the parser normalized prefixes.
    const thumbEl = item.getElementsByTagNameNS(MRSS_NS, 'thumbnail')[0];
    const thumbnail = thumbEl?.getAttribute('url')
      ?? item.querySelector('enclosure')?.getAttribute('url')
      ?? '';

    const author = decodeXmlEntities(stripCData(item.querySelector('author')?.textContent ?? ''));
    const pubDate = stripCData(item.querySelector('pubDate')?.textContent ?? '');

    return { bvid, title, thumbnail, author, pubDate, url: rawLink };
  });

  // Drop completely empty entries (no title and no link); keep AV-id-only items
  // so they still appear in the grid (the player iframe falls back to the URL).
  return parsed.filter((v) => v.title || v.url);
}

/** Fetch one keyword's video list via the background FETCH_RSS bridge and
 *  parse it. Throws on transport or parse failure. */
export async function fetchKeywordVideos(
  keyword: string,
  limit: number = PER_KEYWORD_LIMIT,
): Promise<VideoItem[]> {
  const url = buildFeedUrl(keyword);
  const response: { success: boolean; xml?: string; error?: string } =
    await chrome.runtime.sendMessage({ type: 'FETCH_RSS', url });

  if (!response.success || !response.xml) {
    throw new Error(response.error || 'FETCH_RSS failed');
  }
  const items = parseVideoFeed(response.xml, limit);
  if (items.length === 0) {
    throw new Error('No items found in feed');
  }
  return items;
}

/** True when a keyword is stale enough to warrant a fresh fetch. Used by the
 *  polling effect to skip recently-updated entries (e.g. after a manual
 *  Refresh now click). */
export function isKeywordStale(kw: VideoKeyword, now: number = Date.now()): boolean {
  if (!kw.lastFetched) return true;
  return now - kw.lastFetched >= MIN_REFRESH_GAP_MS;
}

/** Per-keyword fetch delay so concurrent fetches across many keywords don't
 *  fire in a single burst against the public RSSHub instance. */
export function fetchStaggerMs(index: number): number {
  return index * FETCH_STAGGER_MS;
}