import { useCallback, useEffect, useState } from 'react';
import { useI18n } from '../../../i18n';
import styles from './RssFeedManager.module.css';

const FEEDS_KEY = 'browsermain_rss_feeds';
const DEFAULT_FEED_URL = 'https://momoyu.cc/api/hot/rss?code=MSwyLDMsNjksNDcsNTAsMTgsNzIsNDYsOTUsMzYsNjIsNjE=';

export interface RssFeed {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  builtin?: boolean;
}

interface RssFeedManagerProps {
  standalone?: boolean;
  onNavigateHome?: () => void;
}

function loadFeeds(): Promise<RssFeed[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get(FEEDS_KEY, (result) => {
      const feeds = result[FEEDS_KEY] as RssFeed[] | undefined;
      if (Array.isArray(feeds) && feeds.length > 0) {
        resolve(feeds);
        return;
      }
      resolve([
        {
          id: 'builtin-momoyu',
          name: 'Momoyu Hot',
          url: DEFAULT_FEED_URL,
          enabled: true,
          builtin: true,
        },
      ]);
    });
  });
}

function saveFeeds(feeds: RssFeed[]): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [FEEDS_KEY]: feeds }, resolve);
  });
}

export default function RssFeedManager({ standalone, onNavigateHome }: RssFeedManagerProps) {
  const { t } = useI18n();
  const [feeds, setFeeds] = useState<RssFeed[]>([]);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [toast, setToast] = useState('');

  const refresh = useCallback(() => {
    loadFeeds().then(setFeeds);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2000);
  };

  const handleAdd = async () => {
    const trimmedName = name.trim();
    const trimmedUrl = url.trim();
    if (!trimmedName || !trimmedUrl) {
      showToast(t('rssEmptyFields'));
      return;
    }
    try {
      const parsed = new URL(trimmedUrl);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        showToast(t('rssInvalidUrl'));
        return;
      }
    } catch {
      showToast(t('rssInvalidUrl'));
      return;
    }
    if (feeds.some((feed) => feed.url === trimmedUrl)) {
      showToast(t('rssDuplicateUrl'));
      return;
    }
    const next = [
      ...feeds,
      { id: `feed-${Date.now()}`, name: trimmedName, url: trimmedUrl, enabled: true },
    ];
    await saveFeeds(next);
    setFeeds(next);
    setName('');
    setUrl('');
    showToast(t('rssAdded'));
  };

  const toggleFeed = async (id: string) => {
    const next = feeds.map((feed) =>
      feed.id === id ? { ...feed, enabled: !feed.enabled } : feed,
    );
    await saveFeeds(next);
    setFeeds(next);
  };

  const removeFeed = async (feed: RssFeed) => {
    if (!window.confirm(t('rssDeleteConfirm', { name: feed.name }))) return;
    const next = feeds.filter((item) => item.id !== feed.id);
    await saveFeeds(next);
    setFeeds(next);
    showToast(t('rssRemoved'));
  };

  return (
    <div className={`glass-card ${styles.page}`}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t('rssFeedsTitle')}</h1>
        {standalone && onNavigateHome && (
          <button type="button" className={styles.backBtn} onClick={onNavigateHome}>
            {t('back')}
          </button>
        )}
      </div>

      <p className={styles.description}>{t('rssFeedsDescription')}</p>

      <div className={styles.form}>
        <span className={styles.fieldLabel}>{t('rssAddNew')}</span>
        <input
          className={styles.fieldInput}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('rssFeedNamePlaceholder')}
        />
        <input
          className={styles.fieldInput}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://"
        />
        <button type="button" className={styles.addBtn} onClick={handleAdd}>
          {t('rssAddNew')}
        </button>
      </div>

      <div className={styles.feedListTitle}>{t('rssConfiguredFeeds')}</div>
      <div className={styles.feedListHint}>{t('rssDragHint')}</div>

      {feeds.length === 0 ? (
        <div className={styles.empty}>{t('rssEmptyList')}</div>
      ) : (
        <div className={styles.feedList}>
          {feeds.map((feed) => (
            <div key={feed.id} className={styles.feedItem}>
              <div className={styles.feedInfo}>
                <div className={styles.feedName}>{feed.name}</div>
                <div className={styles.feedUrl}>{feed.url}</div>
              </div>
              {feed.builtin && <span className={styles.feedBadge}>{t('rssBuiltIn')}</span>}
              <div className={styles.feedActions}>
                <button
                  type="button"
                  className={styles.actionBtn}
                  onClick={() => toggleFeed(feed.id)}
                >
                  {feed.enabled ? t('rssDisable') : t('rssEnable')}
                </button>
                {!feed.builtin && (
                  <button
                    type="button"
                    className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                    onClick={() => removeFeed(feed)}
                  >
                    {t('delete')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}
