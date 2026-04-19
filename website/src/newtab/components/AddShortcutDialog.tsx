import { useState, useEffect } from 'react';
import { useShortcuts } from '../hooks/useShortcuts';
import { getSmartFaviconUrl, getFaviconIcoUrl, getDomainFromUrl } from '../utils/storage';
import { isUrl } from '../utils/engines';
import styles from '../styles/components/AddShortcutDialog.module.css';

interface AddShortcutDialogProps {
  open: boolean;
  url: string;
  title: string;
  favicon?: string;
  group?: string;
  onClose: () => void;
}

export default function AddShortcutDialog({ open, url, title, favicon, group, onClose }: AddShortcutDialogProps) {
  const [inputUrl, setInputUrl] = useState(url);
  const [inputTitle, setInputTitle] = useState(title);
  const [inputGroup, setInputGroup] = useState(group || '');
  const [faviconUrl, setFaviconUrl] = useState(favicon || (url ? getSmartFaviconUrl(url) : ''));
  const [fetchingTitle, setFetchingTitle] = useState(false);
  // 2-stage favicon fallback: Google S2 → favicon.ico → GlobeIcon
  const [faviconTriedIco, setFaviconTriedIco] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pasteHint, setPasteHint] = useState('');
  const { addShortcut, shortcuts } = useShortcuts();

  // Derive existing group names from current shortcuts for the dropdown
  const existingGroups = Array.from(
    new Set(shortcuts.map((s) => s.group).filter((g): g is string => !!g))
  ).sort();

  // Derived domain from the current input URL
  const domain = inputUrl && isUrl(inputUrl.trim()) ? getDomainFromUrl(inputUrl.trim()) : '';

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
      setInputGroup(group || '');
      setSaved(false);
      setSaving(false);
      setPasteHint('');
      setFaviconTriedIco(false);
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
  }, [open, url, title, favicon, group]);

  // Reset favicon state when input URL changes so the new Google S2 URL is used
  useEffect(() => {
    if (inputUrl && isUrl(inputUrl.trim())) {
      setFaviconUrl(getSmartFaviconUrl(inputUrl.trim()));
      setFaviconTriedIco(false);
    }
  }, [inputUrl]);

  // Auto-fetch page title when a valid URL is entered and title is empty
  useEffect(() => {
    const trimmedUrl = inputUrl.trim();
    if (!trimmedUrl || !isUrl(trimmedUrl) || inputTitle.trim()) return;

    setFetchingTitle(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    fetch(trimmedUrl, { signal: controller.signal })
      .then((res) => res.text())
      .then((html) => {
        clearTimeout(timeout);
        const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (match && match[1]) {
          setInputTitle(match[1].trim());
          setPasteHint('Title auto-filled from page.');
        }
      })
      .catch(() => {
        clearTimeout(timeout);
      })
      .finally(() => {
        setFetchingTitle(false);
      });
  }, [inputUrl]);

  const handleFaviconError = () => {
    if (!faviconTriedIco) {
      // Try favicon.ico as second attempt
      setFaviconUrl(getFaviconIcoUrl(inputUrl.trim() || url));
      setFaviconTriedIco(true);
    } else {
      // Give up — clear favicon to show globe icon
      setFaviconUrl('');
    }
  };

  // Document-level Escape key handling — works regardless of focus location
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleSave = async () => {
    const trimmedUrl = inputUrl.trim();
    const trimmedTitle = inputTitle.trim();
    if (!trimmedUrl || isInvalidUrl) return;

    setSaving(true);
    try {
      const groupValue = inputGroup.trim() || undefined;
      await addShortcut(trimmedTitle || trimmedUrl, trimmedUrl, faviconUrl, groupValue);
      setSaved(true);
      setTimeout(() => {
        onClose();
      }, 800);
    } catch {
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Add Shortcut">
        {/* Header */}
        <div className={styles.header}>
          <span className={styles.headerTitle}>ADD SHORTCUT</span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Body + Footer (form wraps everything so Enter submits and form attribute connects buttons) */}
        <form id="add-shortcut-form" className={styles.body} onSubmit={(e) => { e.preventDefault(); handleSave(); }} noValidate>
          {/* Favicon preview — GlobeIcon shown when both Google S2 and favicon.ico fail */}
          {(faviconUrl || inputUrl.trim()) && (
            <div className={styles.faviconRow}>
              {faviconUrl ? (
                <img src={faviconUrl} alt="" className={styles.faviconImg} onError={handleFaviconError} />
              ) : (
                <svg className={styles.faviconGlobe} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="2" y1="12" x2="22" y2="12"/>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
              )}
              <div className={styles.faviconTextCol}>
                <span className={styles.faviconDomain}>{domain || '—'}</span>
                <span className={styles.faviconHint}>Current page</span>
              </div>
            </div>
          )}

          {/* URL field */}
          <div className={styles.field}>
            <label className={styles.label}>URL</label>
            <div className={styles.inputWrapper}>
              <input
                className={styles.input}
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                onPaste={(e) => {
                  const text = e.clipboardData.getData('text');
                  if (isUrl(text)) {
                    e.preventDefault();
                    setInputUrl(text);
                    // Favicon update is handled by the inputUrl effect above
                  }
                }}
                placeholder="https://example.com"
                autoFocus
              />
              {trimmedUrl.length > 0 && (
                <span
                  className={`${styles.statusDot} ${
                    isInvalidUrl ? styles.statusDotInvalid :
                    isDuplicate  ? styles.statusDotDuplicate :
                                    styles.statusDotValid
                  }`}
                />
              )}
            </div>
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
                  // Favicon update is handled by the inputUrl effect above
                }
              }}
              placeholder="My Shortcut"
            />
            {(pasteHint || fetchingTitle) && <span className={styles.pasteHint}>{fetchingTitle ? 'Fetching title…' : pasteHint}</span>}
          </div>

          {/* Group field */}
          <div className={styles.field}>
            <label className={styles.label}>GROUP</label>
            <input
              className={styles.input}
              type="text"
              value={inputGroup}
              onChange={(e) => setInputGroup(e.target.value)}
              placeholder="e.g. Work, Social, Dev Tools"
              list="add-shortcut-group-suggestions"
            />
            <datalist id="add-shortcut-group-suggestions">
              {existingGroups.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
            <span className={styles.pasteHint} style={{ fontSize: 10, opacity: 0.55 }}>
              {existingGroups.length > 0 ? `${existingGroups.length} group${existingGroups.length > 1 ? 's' : ''} available` : 'No groups yet'}
            </span>
          </div>

          {/* Footer */}
          <div className={styles.footer}>
            {saved ? (
              <div className={styles.successMsg}>✓ Saved!</div>
            ) : (
              <>
                <button type="button" className={styles.cancelBtn} form="add-shortcut-form" onClick={onClose} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" form="add-shortcut-form" className={styles.saveBtn} disabled={saving || !inputUrl.trim() || isInvalidUrl}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
