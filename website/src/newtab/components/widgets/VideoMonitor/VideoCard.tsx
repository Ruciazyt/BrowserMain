import { useState } from 'react';
import type { VideoItem } from '../../../utils/videoMonitor';
import styles from './VideoMonitor.module.css';

interface VideoCardProps {
  video: VideoItem;
  onPlay: (bvid: string) => void;
}

/** Pure presentational card: thumbnail (with onError fallback), title, and
 *  author/pubDate meta line. Click delegates to onPlay; if `bvid` is missing
 *  (AV-id-only item) we open the canonical bilibili URL in a new tab. */
export default function VideoCard({ video, onPlay }: VideoCardProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const handleClick = () => {
    if (video.bvid) {
      onPlay(video.bvid);
      return;
    }
    if (video.url) {
      chrome.tabs.create({ url: video.url });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      className={styles.card}
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={video.title}
    >
      <div className={styles.thumbWrap}>
        {video.thumbnail && !imgFailed ? (
          <img
            className={styles.thumb}
            src={video.thumbnail}
            alt={video.title}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className={styles.thumbFallback} aria-hidden="true">▶</div>
        )}
      </div>
      <div className={styles.cardBody}>
        <div className={styles.cardTitle} title={video.title}>
          {video.title}
        </div>
        {(video.author || video.pubDate) && (
          <div className={styles.cardMeta}>
            {video.author && <span className={styles.cardAuthor}>{video.author}</span>}
            {video.author && video.pubDate && <span className={styles.dot}>·</span>}
            {video.pubDate && <span className={styles.cardDate}>{video.pubDate}</span>}
          </div>
        )}
      </div>
    </div>
  );
}