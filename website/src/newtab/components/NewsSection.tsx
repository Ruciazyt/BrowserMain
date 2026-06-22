import { useState, useEffect, useCallback, useRef } from 'react';
import Sortable from 'sortablejs';
import { useI18n } from '../i18n';
import { FEEDS_KEY, loadFeeds, fetchFeedGroups, type NewsGroup } from '../utils/rssFeeds';
import styles from './widgets/NewsSection/NewsSection.module.css';

const CACHE_TTL = 10 * 60 * 1000;
const ORDER_KEY = 'browsermain_news_order';
const HIDDEN_KEY = 'browsermain_news_hidden';

interface NewsResult {
  groups: NewsGroup[];
  enabledCount: number;
}

interface CachedData {
  result: NewsResult;
  updatedAt: number;
}

let memoryCache: CachedData | null = null;

async function fetchNews(): Promise<NewsResult> {
  if (memoryCache && Date.now() - memoryCache.updatedAt < CACHE_TTL) {
    return memoryCache.result;
  }
  const enabled = (await loadFeeds()).filter((f) => f.enabled);
  const results = await Promise.allSettled(enabled.map(fetchFeedGroups));
  const groups: NewsGroup[] = [];
  enabled.forEach((feed, i) => {
    const r = results[i];
    if (r.status === 'fulfilled') {
      groups.push(...r.value);
    } else {
      // Per-feed failure (CORS-denied, offline, invalid XML) → error card so the user
      // sees which feed broke instead of a silently missing card.
      groups.push({ platform: feed.name, items: [], error: true });
    }
  });
  const result: NewsResult = { groups, enabledCount: enabled.length };
  memoryCache = { result, updatedAt: Date.now() };
  return result;
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

function loadHidden(): Promise<string[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get(HIDDEN_KEY, (r) => {
      resolve(Array.isArray(r[HIDDEN_KEY]) ? r[HIDDEN_KEY] : []);
    });
  });
}

function saveHidden(hidden: string[]) {
  chrome.storage.local.set({ [HIDDEN_KEY]: hidden });
}

function sortByOrder(groups: NewsGroup[], order: string[]): NewsGroup[] {
  if (order.length === 0) return groups;
  const indexed = new Map(groups.map((g) => [g.platform, g]));
  const sorted: NewsGroup[] = [];
  for (const name of order) {
    const g = indexed.get(name);
    if (g) {
      sorted.push(g);
      indexed.delete(g.platform);
    }
  }
  for (const g of indexed.values()) sorted.push(g);
  return sorted;
}

interface NewsSectionProps {
  columns?: number;
  onManageFeeds?: () => void;
}

export default function NewsSection({ columns = 2, onManageFeeds }: NewsSectionProps) {
  const { t } = useI18n();
  const [groups, setGroups] = useState<NewsGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [empty, setEmpty] = useState(false);
  const [hiddenPlatforms, setHiddenPlatforms] = useState<string[]>([]);
  const timerRef = useRef<number | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const sortableRef = useRef<Sortable | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    setEmpty(false);
    try {
      const [news, order, hidden] = await Promise.all([fetchNews(), loadOrder(), loadHidden()]);
      setHiddenPlatforms(hidden);
      setEmpty(news.enabledCount === 0);
      setGroups(sortByOrder(news.groups, order).filter((g) => !hidden.includes(g.platform)));
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

  // Live-refresh when the feed list changes (add / toggle / remove) so the home
  // dashboard reflects changes immediately, not only on the next poll or remount.
  useEffect(() => {
    const handler = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: chrome.storage.AreaName,
    ) => {
      if (area === 'local' && changes[FEEDS_KEY]) {
        memoryCache = null;
        load();
      }
    };
    chrome.storage.onChanged.addListener(handler);
    return () => chrome.storage.onChanged.removeListener(handler);
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
          const indexed = new Map(prev.map((g) => [g.platform, g] as const));
          const sorted: NewsGroup[] = [];
          for (const name of order) {
            const g = indexed.get(name);
            if (g) sorted.push(g);
          }
          // Append any platforms the DOM didn't include (defensive against Sortable quirks)
          for (const g of prev) {
            if (!order.includes(g.platform)) sorted.push(g);
          }
          return sorted;
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

  const deleteCard = (platform: string) => {
    const updated = [...hiddenPlatforms, platform];
    setHiddenPlatforms(updated);
    saveHidden(updated);
    setGroups((prev) => prev.filter((g) => g.platform !== platform));
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
            <div key={i} className={`glass-card ${styles.card}`}>
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
      ) : empty ? (
        <div className={styles.empty}>
          <span>{t('rssEmptyAll')}</span>
          {onManageFeeds && (
            <button className={styles.retryBtn} onClick={onManageFeeds}>{t('rssManageFeeds')}</button>
          )}
        </div>
      ) : error ? (
        <div className={styles.empty}>
          <span>{t('newsLoadFailed')}</span>
          <button className={styles.retryBtn} onClick={() => { memoryCache = null; load(); }}>{t('retry')}</button>
        </div>
      ) : groups.length === 0 ? (
        <div className={styles.empty}>
          <span>{t('newsAllHidden')}</span>
          <button
            className={styles.retryBtn}
            onClick={() => {
              setHiddenPlatforms([]);
              saveHidden([]);
              memoryCache = null;
              load();
            }}
          >
            {t('newsRestoreAll')}
          </button>
        </div>
      ) : (
        <div className={styles.grid} ref={gridRef} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {groups.map((group) => (
            <div key={group.platform} className={`glass-card ${styles.card}`} data-platform={group.platform}>
              <div className={styles.cardHeader} data-card-header>
                <span>{group.platform}</span>
                <button
                  className={styles.deleteBtn}
                  onClick={(e) => { e.stopPropagation(); deleteCard(group.platform); }}
                  title={t('delete')}
                  aria-label={`${t('delete')} ${group.platform}`}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              {group.error ? (
                <div className={styles.cardError}>{t('rssFeedLoadFailed')}</div>
              ) : (
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
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
