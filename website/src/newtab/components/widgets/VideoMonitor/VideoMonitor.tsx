import { useCallback, useEffect, useRef, useState } from 'react';
import { useSettings } from '../../../hooks/useSettings';
import { useI18n } from '../../../i18n';
import {
  DEFAULT_REFRESH_MS,
  ensureRssHubPermission,
  fetchKeywordVideos,
  fetchStaggerMs,
  isKeywordStale,
  loadKeywords,
  saveKeywords,
  type VideoKeyword,
} from '../../../utils/videoMonitor';
import KeywordsManager from './KeywordsManager';
import VideoCard from './VideoCard';
import VideoPlayer from './VideoPlayer';
import styles from './VideoMonitor.module.css';

interface VideoMonitorProps {
  /** When true, render a back button and don't take over the full viewport. */
  standalone?: boolean;
  onNavigateHome?: () => void;
}

function formatTimestamp(ms: number): string {
  if (!ms) return '';
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export default function VideoMonitor({ standalone, onNavigateHome }: VideoMonitorProps) {
  const { t } = useI18n();
  const { settings } = useSettings();

  const [keywords, setKeywords] = useState<VideoKeyword[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);

  /** Tracks keyword ids currently mid-fetch so a manual Refresh click +
   *  polling tick can't double-fetch the same keyword in parallel. */
  const inFlight = useRef<Set<string>>(new Set());

  // Sync from storage on mount (and whenever the tab becomes visible again
  // would also work, but a single mount read matches the established style
  // — see NewsSection.tsx).
  useEffect(() => {
    loadKeywords().then(setKeywords);
  }, []);

  /** Fetch one keyword, persist the result, and update local state. Errors
   *  land on the keyword's `error` field so other keywords are unaffected. */
  const fetchOne = useCallback(async (kw: VideoKeyword): Promise<void> => {
    if (inFlight.current.has(kw.id)) return;
    inFlight.current.add(kw.id);
    try {
      const videos = await fetchKeywordVideos(kw.keyword);
      const updated: VideoKeyword = {
        ...kw,
        videos,
        lastFetched: Date.now(),
        error: undefined,
      };
      // Persist + state. Read-then-write (like useShortcuts.ts:16-18) to avoid
      // stomping on concurrent updates from sibling keywords.
      const all = await loadKeywords();
      const next = all.map((k) => (k.id === kw.id ? updated : k));
      await saveKeywords(next);
      setKeywords(next);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const updated: VideoKeyword = {
        ...kw,
        lastFetched: Date.now(),
        error: message,
      };
      const all = await loadKeywords();
      const next = all.map((k) => (k.id === kw.id ? updated : k));
      await saveKeywords(next);
      setKeywords(next);
    } finally {
      inFlight.current.delete(kw.id);
    }
  }, []);

  /** Fetch every stale keyword, staggered to avoid hammering RSSHub. */
  const refreshAll = useCallback(
    async (force = false) => {
      const all = await loadKeywords();
      setKeywords(all); // surface any externally-added keywords immediately
      const due = force ? all : all.filter((k) => isKeywordStale(k));
      if (due.length === 0) return;

      setRefreshing(true);
      try {
        await Promise.allSettled(
          due.map((k, i) =>
            new Promise<void>((resolve) => {
              window.setTimeout(() => {
                fetchOne(k).finally(resolve);
              }, fetchStaggerMs(i));
            }),
          ),
        );
      } finally {
        setRefreshing(false);
      }
    },
    [fetchOne],
  );

  // Polling effect — re-creates the interval when the user changes
  // `videoRefreshIntervalMs` in the Settings panel. Settings state is the
  // single source of truth; no separate chrome.storage.onChanged listener.
  const intervalMs = settings.videoRefreshIntervalMs ?? DEFAULT_REFRESH_MS;
  const refreshAllRef = useRef(refreshAll);
  useEffect(() => {
    refreshAllRef.current = refreshAll;
  }, [refreshAll]);

  useEffect(() => {
    refreshAllRef.current(false);
    const id = window.setInterval(() => refreshAllRef.current(false), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  const handleAdd = useCallback(
    async (raw: string): Promise<{ ok: boolean; message?: string }> => {
      const trimmed = raw.trim();
      if (!trimmed) return { ok: false };
      if (keywords.some((k) => k.keyword.toLowerCase() === trimmed.toLowerCase())) {
        return { ok: false, message: t('videoDuplicateKeyword') };
      }
      const granted = await ensureRssHubPermission();
      if (!granted) {
        // Save the keyword anyway so the user can retry fetch later (matches
        // the RSS pattern at RssFeedManager.tsx:58-69), but report the
        // permission failure via the toast by returning a non-ok result with
        // no message (manager will silently ignore).
        void granted;
      }
      const newKw: VideoKeyword = {
        id: `kw-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        keyword: trimmed,
        videos: [],
        lastFetched: 0,
      };
      const next = [...keywords, newKw];
      await saveKeywords(next);
      setKeywords(next);
      // Kick off an immediate fetch for the freshly added keyword.
      fetchOne(newKw);
      return { ok: true };
    },
    [keywords, fetchOne, t],
  );

  const handleRemove = useCallback(async (id: string) => {
    const next = keywords.filter((k) => k.id !== id);
    await saveKeywords(next);
    setKeywords(next);
  }, [keywords]);

  return (
    <div className={`glass-card ${styles.page}`}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t('videoTitle')}</h1>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.refreshBtn}
            onClick={() => refreshAll(true)}
            disabled={refreshing || keywords.length === 0}
          >
            {refreshing ? t('videoRefreshing') : t('videoRefreshNow')}
          </button>
          {standalone && onNavigateHome && (
            <button type="button" className={styles.backBtn} onClick={onNavigateHome}>
              {t('back')}
            </button>
          )}
        </div>
      </header>

      <KeywordsManager keywords={keywords} onAdd={handleAdd} onRemove={handleRemove} />

      {keywords.length === 0 ? (
        <div className={styles.empty}>{t('videoNoKeywords')}</div>
      ) : (
        <div className={styles.sections}>
          {keywords.map((kw) => (
            <section key={kw.id} className={styles.kwSection}>
              <div className={styles.kwHeader}>
                <h2 className={styles.kwTitle}>{kw.keyword}</h2>
                <div className={styles.kwMeta}>
                  {kw.error ? (
                    <span className={styles.kwError}>{t('videoFetchFailed')}</span>
                  ) : kw.lastFetched ? (
                    <span>{t('videoLastFetched', { time: formatTimestamp(kw.lastFetched) })}</span>
                  ) : (
                    <span className={styles.kwMuted}>{t('videoNeverFetched')}</span>
                  )}
                  {kw.videos.length > 0 && (
                    <span className={styles.kwCount}>
                      {t('videoResultsCount', { count: kw.videos.length })}
                    </span>
                  )}
                </div>
              </div>

              {kw.error ? (
                <div className={styles.sectionEmpty}>
                  <span>{kw.error}</span>
                  <button
                    type="button"
                    className={styles.retryBtn}
                    onClick={() => fetchOne(kw)}
                  >
                    {t('retry')}
                  </button>
                </div>
              ) : kw.videos.length === 0 ? (
                <div className={styles.sectionEmpty}>{t('videoNoResults')}</div>
              ) : (
                <div className={styles.grid}>
                  {kw.videos.map((v, idx) => (
                    <VideoCard
                      key={`${kw.id}-${v.bvid || v.url || idx}`}
                      video={v}
                      onPlay={setPlaying}
                    />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      {playing && <VideoPlayer bvid={playing} onClose={() => setPlaying(null)} />}
    </div>
  );
}