import { useState } from 'react';
import { useI18n } from '../../../i18n';
import type { VideoKeyword } from '../../../utils/videoMonitor';
import styles from './VideoMonitor.module.css';

interface KeywordsManagerProps {
  keywords: VideoKeyword[];
  onAdd: (rawKeyword: string) => Promise<{ ok: boolean; message?: string }>;
  onRemove: (id: string) => void;
}

/** Chip-style keyword list with an inline add input. Modeled on the form at
 *  RssFeedManager.tsx:107-124 but compacted — only one field (keyword). */
export default function KeywordsManager({ keywords, onAdd, onRemove }: KeywordsManagerProps) {
  const { t } = useI18n();
  const [draft, setDraft] = useState('');
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    const result = await onAdd(trimmed);
    if (result.ok) {
      setDraft('');
    } else if (result.message) {
      showToast(result.message);
    }
  };

  const handleRemove = (kw: VideoKeyword) => {
    if (!window.confirm(t('videoRemoveKeywordConfirm', { keyword: kw.keyword }))) return;
    onRemove(kw.id);
  };

  return (
    <div className={styles.manager}>
      <form className={styles.addForm} onSubmit={handleSubmit}>
        <input
          className={styles.addInput}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t('videoKeywordPlaceholder')}
          aria-label={t('videoAddKeyword')}
        />
        <button
          type="submit"
          className={styles.addBtn}
          disabled={draft.trim().length === 0}
        >
          {t('videoAddKeyword')}
        </button>
      </form>

      {keywords.length > 0 && (
        <div className={styles.chipRow} role="list">
          {keywords.map((kw) => (
            <span key={kw.id} className={styles.chip} role="listitem">
              <span className={styles.chipText}>{kw.keyword}</span>
              <button
                type="button"
                className={styles.chipRemove}
                onClick={() => handleRemove(kw)}
                aria-label={`${t('videoRemoveKeyword')}: ${kw.keyword}`}
                title={t('videoRemoveKeyword')}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}