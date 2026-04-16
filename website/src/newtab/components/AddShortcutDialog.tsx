import { useState, useEffect } from 'react';
import { useShortcuts } from '../hooks/useShortcuts';
import styles from '../styles/components/AddShortcutDialog.module.css';

interface AddShortcutDialogProps {
  open: boolean;
  url: string;
  title: string;
  favicon?: string;
  onClose: () => void;
}

export default function AddShortcutDialog({ open, url, title, favicon, onClose }: AddShortcutDialogProps) {
  const [inputUrl, setInputUrl] = useState(url);
  const [inputTitle, setInputTitle] = useState(title);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { addShortcut } = useShortcuts();

  // Sync props → local state when dialog opens
  useEffect(() => {
    if (open) {
      setInputUrl(url);
      setInputTitle(title);
      setSaved(false);
      setSaving(false);
    }
  }, [open, url, title]);

  if (!open) return null;

  const handleSave = async () => {
    const trimmedUrl = inputUrl.trim();
    const trimmedTitle = inputTitle.trim();
    if (!trimmedUrl) return;

    setSaving(true);
    try {
      await addShortcut(trimmedTitle || trimmedUrl, trimmedUrl, favicon);
      setSaved(true);
      setTimeout(() => {
        onClose();
      }, 800);
    } catch {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        {/* Header */}
        <div className={styles.header}>
          <span className={styles.headerTitle}>ADD SHORTCUT</span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {/* Favicon preview */}
          {favicon && (
            <div className={styles.faviconRow}>
              <img src={favicon} alt="" className={styles.faviconImg} />
              <span className={styles.faviconHint}>Current page</span>
            </div>
          )}

          {/* URL field */}
          <div className={styles.field}>
            <label className={styles.label}>URL</label>
            <input
              className={styles.input}
              type="url"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="https://example.com"
              autoFocus
            />
          </div>

          {/* Title field */}
          <div className={styles.field}>
            <label className={styles.label}>TITLE</label>
            <input
              className={styles.input}
              type="text"
              value={inputTitle}
              onChange={(e) => setInputTitle(e.target.value)}
              placeholder="My Shortcut"
            />
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          {saved ? (
            <div className={styles.successMsg}>✓ Saved!</div>
          ) : (
            <>
              <button className={styles.cancelBtn} onClick={onClose} disabled={saving}>
                Cancel
              </button>
              <button className={styles.saveBtn} onClick={handleSave} disabled={saving || !inputUrl.trim()}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
