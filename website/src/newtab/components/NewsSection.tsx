import { useState, useEffect, useCallback, useRef } from 'react';
import Sortable from 'sortablejs';
import { useI18n } from '../i18n';
import styles from '../styles/components/NewsSection.module.css';

const RSS_URL = 'https://momoyu.cc/api/hot/rss?code=MSwyLDMsNjksNDcsNTAsMTgsNzIsNDYsOTUsMzYsNjIsNjE=';
const CACHE_TTL = 10 * 60 * 1000;
const ORDER_KEY = 'browsermain_news_order';

interface NewsItem {
  id: string;
  title: string;
  url: string;
  rank: number;
}

interface NewsGroup {
  platform: string;
  items: NewsItem[];
}

interface CachedData {
  groups: NewsGroup[];
  updatedAt: number;
}

let memoryCache: CachedData | null = null;

function parseRssDescription(html: string): NewsGroup[] {
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

async function fetchNews(): Promise<NewsGroup[]> {
  if (memoryCache && Date.now() - memoryCache.updatedAt < CACHE_TTL) {
    return memoryCache.groups;
  }
  const response: { success: boolean; xml?: string; error?: string } = await chrome.runtime.sendMessage({
    type: 'FETCH_RSS',
    url: RSS_URL,
  });
  if (!response.success || !response.xml) {
    throw new Error(response.error || 'RSS fetch failed');
  }
  const doc = new DOMParser().parseFromString(response.xml, 'text/xml');
  const items = doc.querySelectorAll('item');
  if (items.length === 0) throw new Error('No RSS items found');
  const description = items[0].querySelector('description')?.textContent || '';
  const groups = parseRssDescription(description);
  memoryCache = { groups, updatedAt: Date.now() };
  return groups;
}

function loadOrder(): Promise<string[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get(ORDER_KEY, (r) => {
      resolve(Array.isArray(r[ORDER_KEY]) ? r[ORDER_KEY] : []);
    });
  });
}

function saveOrder(order: string[]) {
  chrome.storage.local.set({ [ORDER_KEY]: order });
}

function sortByOrder(groups: NewsGroup[], order: string[]): NewsGroup[] {
  if (order.length === 0) return groups;
  const indexed = new Map(groups.map((g) => [g.platform, g]));
  const sorted: NewsGroup[] = [];
  for (const name of order) {
    const g = indexed.get(name);
    if (g) {
      sorted.push(g);
      indexed.delete(name);
    }
  }
  for (const g of indexed.values()) sorted.push(g);
  return sorted;
}

export default function NewsSection({ columns = 2 }: { columns?: number }) {
  const { t } = useI18n();
  const [groups, setGroups] = useState<NewsGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const timerRef = useRef<number | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const sortableRef = useRef<Sortable | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [data, order] = await Promise.all([fetchNews(), loadOrder()]);
      setGroups(sortByOrder(data, order));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    timerRef.current = window.setInterval(load, CACHE_TTL);
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
    };
  }, [load]);

  // Create Sortable instance after groups are rendered
  useEffect(() => {
    if (!gridRef.current || groups.length === 0) return;

    if (sortableRef.current) {
      sortableRef.current.destroy();
    }

    sortableRef.current = Sortable.create(gridRef.current, {
      animation: 180,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      handle: '[data-card-header]',
      ghostClass: styles.ghost,
      chosenClass: styles.chosen,
      dragClass: styles.drag,
      onEnd: () => {
        const cards = gridRef.current?.querySelectorAll('[data-platform]') || [];
        const order = Array.from(cards).map((el) => (el as HTMLElement).dataset.platform || '');
        saveOrder(order);
        setGroups((prev) => {
          const indexed = new Map(prev.map((g) => [g.platform, g]));
          return order.map((name) => indexed.get(name)!).filter(Boolean);
        });
      },
    });

    return () => {
      if (sortableRef.current) {
        sortableRef.current.destroy();
        sortableRef.current = null;
      }
    };
  }, [groups]);

  const openUrl = (url: string) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) chrome.tabs.update(tabs[0].id, { url });
    });
  };

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h3 className={styles.title}>{t('newsTitle')}</h3>
        <button
          className={styles.refreshBtn}
          onClick={() => { memoryCache = null; load(); }}
          title={t('refresh')}
          aria-label={t('refresh')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
        </button>
      </div>

      {loading && groups.length === 0 ? (
        <div className={styles.grid} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.card}>
              <div className={`${styles.skeleton} ${styles.skeletonGroupTitle}`} />
              <div className={styles.cardList}>
                {Array.from({ length: 3 }).map((__, j) => (
                  <div key={j} className={styles.cardItem}>
                    <span className={styles.skeletonIndex} />
                    <div className={`${styles.skeleton} ${styles.skeletonTitle}`} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className={styles.empty}>
          <span>{t('newsLoadFailed')}</span>
          <button className={styles.retryBtn} onClick={() => { memoryCache = null; load(); }}>{t('retry')}</button>
        </div>
      ) : (
        <div className={styles.grid} ref={gridRef} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {groups.map((group) => (
            <div key={group.platform} className={styles.card} data-platform={group.platform}>
              <div className={styles.cardHeader} data-card-header>{group.platform}</div>
              <div className={styles.cardList}>
                {group.items.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className={styles.cardItem}
                    onClick={() => openUrl(item.url)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') openUrl(item.url); }}
                  >
                    <span className={styles.index}>{item.rank}</span>
                    <span className={styles.cardItemTitle}>{item.title}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
