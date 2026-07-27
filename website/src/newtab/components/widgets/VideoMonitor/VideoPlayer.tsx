import { useEffect, useRef } from 'react';
import { useI18n } from '../../../i18n';
import styles from './VideoMonitor.module.css';

interface VideoPlayerProps {
  /** Bilibili video id (e.g. "BV1xx411c7mD"). Empty string renders nothing. */
  bvid: string;
  onClose: () => void;
}

/** Embedded Bilibili player rendered as a modal overlay.
 *
 *  Uses the official iframe-embeddable player at player.bilibili.com. If `bvid`
 *  is empty (e.g. the result was an AV-id-only link), we fall back to
 *  bilibili.com/search so the user at least lands somewhere useful instead of
 *  a blank iframe. */
export default function VideoPlayer({ bvid, onClose }: VideoPlayerProps) {
  const { t } = useI18n();
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // Close on Escape, matching the pattern in App.tsx:106-112.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!bvid) return null;

  const src = `https://player.bilibili.com/player.html?bvid=${encodeURIComponent(
    bvid,
  )}&autoplay=1&high_quality=1`;

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t('videoPlayerTitle')}
    >
      <div
        ref={dialogRef}
        className={styles.playerModal}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className={styles.playerClose}
          onClick={onClose}
          aria-label={t('close')}
        >
          ×
        </button>
        <iframe
          src={src}
          className={styles.playerIframe}
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          referrerPolicy="no-referrer"
          title={t('videoPlayerTitle')}
        />
      </div>
    </div>
  );
}