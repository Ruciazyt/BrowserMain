import { useState, useEffect } from 'react';
import { useShortcuts } from '../hooks/useShortcuts';
import { getSmartFaviconUrl } from '../utils/storage';
import { isUrl } from '../utils/engines';
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
  const [faviconUrl, setFaviconUrl] = useState(favicon || (url ? getSmartFaviconUrl(url) : ''));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pasteHint, setPasteHint] = useState('');
  const { addShortcut, shortcuts } = useShortcuts();

  // Check if entered URL is a duplicate or invalid
  const trimmedUrl = inputUrl.trim();
  const isInvalidUrl = trimmedUrl.length > 0 && !isUrl(trimmedUrl);
  const isDuplicate = trimmedUrl.length > 0 && isUrl(trimmedUrl) && shortcuts.some((s) => s.url.toLowerCase() === trimmedUrl.toLowerCase());

  // Clear paste hint after 3 seconds
  useEffect(() => {
    if (!pasteHint) return;
    const timer = setTimeout(() => setPasteHint(''), 3000);
    return () => clearTimeout(timer);
  }, [pasteHint]);

  // Sync props → local state when dialog opens; auto-fetch favicon if none provided
  useEffect(() => {
    if (open) {
      setInputUrl(url);
      setInputTitle(title);
      setSaved(false);
      setSaving(false);
      setPasteHint('');
      // Auto-fetch favicon if none provided but URL is available
      // Use getSmartFaviconUrl (Google S2) for best quality, consistent with ShortcutTile
      if (favicon) {
        setFaviconUrl(favicon);
      } else if (url) {
        setFaviconUrl(getSmartFaviconUrl(url));
      } else {
        setFaviconUrl('');
      }
    }
  }, [open, url, title, favicon]);

  if (!open) return null;

  const handleSave = async () => {
    const trimmedUrl = inputUrl.trim();
    const trimmedTitle = inputTitle.trim();
    if (!trimmedUrl || isInvalidUrl) return;

    setSaving(true);
    try {
      await addShortcut(trimmedTitle || trimmedUrl, trimmedUrl, faviconUrl);
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
          {faviconUrl && (
            <div className={styles.faviconRow}>
              <img src={faviconUrl} alt="" className={styles.faviconImg} />
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
              onPaste={(e) => {
                const text = e.clipboardData.getData('text');
                if (isUrl(text)) {
                  e.preventDefault();
                  setInputUrl(text);
                  setFaviconUrl(getSmartFaviconUrl(text));
                }
              }}
              placeholder="https://example.com"
              autoFocus
            />
            {isInvalidUrl && (
              <span className={styles.duplicateWarning}>⚠ Please enter a valid URL (https://...)</span>
            )}
            {!isInvalidUrl && isDuplicate && (
              <span className={styles.duplicateWarning}>⚠ URL already exists in your shortcuts</span>
            )}
          </div>

          {/* Title field */}
          <div className={styles.field}>
            <label className={styles.label}>TITLE</label>
            <input
              className={styles.input}
              type="text"
              value={inputTitle}
              onChange={(e) => setInputTitle(e.target.value)}
              onPaste={(e) => {
                const text = e.clipboardData.getData('text');
                if (isUrl(text)) {
                  e.preventDefault();
                  setInputUrl(text);
                  setInputTitle('');
                  setPasteHint('URL detected — moved to URL field.');
                  // Auto-fetch favicon for pasted URL
                  setFaviconUrl(getSmartFaviconUrl(text));
                }
              }}
              placeholder="My Shortcut"
            />
            {pasteHint && <span className={styles.pasteHint}>{pasteHint}</span>}
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
              <button className={styles.saveBtn} onClick={handleSave} disabled={saving || !inputUrl.trim() || isInvalidUrl}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
