import { useState, useRef } from 'react';
import { importShortcutsFromJson } from '../hooks/useShortcuts';
import { useI18n } from '../i18n';
import styles from '../styles/components/ShortcutImport.module.css';

interface ShortcutImportProps {
  onBack: () => void;
  onImported?: () => void;
}

export default function ShortcutImport({ onBack, onImported }: ShortcutImportProps) {
  const { t } = useI18n();
  const [result, setResult] = useState<{ imported: number; error?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const res = await importShortcutsFromJson(file);
    setResult(res);
    if (res.imported > 0) {
      onImported?.();
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack} aria-label={t('back')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
            <polyline points="15 18 9 12 15 6" />
          </svg>
          {t('back')}
        </button>
        <span className={styles.headerTitle}>{t('importShortcutsTitle')}</span>
      </div>

      {result === null ? (
        <div className={styles.resultState} style={{ flexDirection: 'column', gap: 16 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: 'var(--text-bright)', marginBottom: 8 }}>{t('importShortcutsText')}</div>
            <button className={styles.importBtn} onClick={() => fileInputRef.current?.click()} style={{ width: '100%' }}>
              📥 {t('importFromJson')}
            </button>
            <input ref={fileInputRef} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={handleFileChange} />
          </div>
        </div>
      ) : (
        <div className={styles.resultState}>
          <span className={styles.resultIcon}>{result.error ? '⚠️' : '✅'}</span>
          <div className={styles.resultText}>
            <span className={styles.resultTitle}>
              {result.error ? t('importFailed') : t('importComplete')}
            </span>
            <span className={styles.resultDetail}>
              {result.error || (result.imported > 0 ? t('shortcutsImported', { count: result.imported }) : t('noNewShortcuts'))}
            </span>
          </div>
          <button className={styles.doneBtn} onClick={onBack}>{t('done')}</button>
        </div>
      )}
    </div>
  );
}
