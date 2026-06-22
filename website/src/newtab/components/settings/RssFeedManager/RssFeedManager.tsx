import { useCallback, useEffect, useState } from 'react';
import { useI18n } from '../../../i18n';
import {
  loadFeeds,
  saveFeeds,
  requestFeedPermission,
  removeFeedPermission,
  type RssFeed,
} from '../../../utils/rssFeeds';
import styles from './RssFeedManager.module.css';

interface RssFeedManagerProps {
  standalone?: boolean;
  onNavigateHome?: () => void;
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
    // Request cross-origin host permission while still in the click gesture (first await).
    // The feed is saved either way; without permission it will surface as a load-failed card.
    const granted = await requestFeedPermission(trimmedUrl);
    const next: RssFeed[] = [
      ...feeds,
      { id: `feed-${Date.now()}`, name: trimmedName, url: trimmedUrl, enabled: true },
    ];
    await saveFeeds(next);
    setFeeds(next);
    setName('');
    setUrl('');
    showToast(granted ? t('rssAdded') : t('rssPermissionDenied'));
  };

  const toggleFeed = async (feed: RssFeed) => {
    const enabling = !feed.enabled;
    if (enabling && !feed.builtin) {
      const granted = await requestFeedPermission(feed.url);
      if (!granted) showToast(t('rssPermissionDenied'));
    }
    const next = feeds.map((f) =>
      f.id === feed.id ? { ...f, enabled: !f.enabled } : f,
    );
    await saveFeeds(next);
    setFeeds(next);
  };

  const removeFeed = async (feed: RssFeed) => {
    if (!window.confirm(t('rssDeleteConfirm', { name: feed.name }))) return;
    if (!feed.builtin) {
      void removeFeedPermission(feed.url);
    }
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
                  onClick={() => toggleFeed(feed)}
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
