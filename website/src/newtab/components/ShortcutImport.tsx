import { useState, useRef } from 'react';
import { exportShortcutsAsJson, importShortcutsFromJson } from '../hooks/useShortcuts';
import styles from '../styles/components/ShortcutImport.module.css';

interface ShortcutImportProps {
  onBack: () => void;
  onImported?: () => void;
}

export default function ShortcutImport({ onBack, onImported }: ShortcutImportProps) {
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

  const handleExport = () => {
    exportShortcutsAsJson();
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack} aria-label="Back to settings">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <span className={styles.headerTitle}>Export / Import</span>
      </div>

      {result === null ? (
        <>
          <div className={styles.resultState} style={{ flexDirection: 'column', gap: 16 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: 'var(--text-bright)', marginBottom: 8 }}>Export your shortcuts</div>
              <button className={styles.importBtn} onClick={handleExport} style={{ width: '100%' }}>
                📤 Export as JSON
              </button>
            </div>
            <div style={{ textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16 }}>
              <div style={{ fontSize: 14, color: 'var(--text-bright)', marginBottom: 8 }}>Import shortcuts from file</div>
              <button className={styles.importBtn} onClick={() => fileInputRef.current?.click()} style={{ width: '100%' }}>
                📥 Import from JSON
              </button>
              <input ref={fileInputRef} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={handleFileChange} />
            </div>
          </div>
        </>
      ) : (
        <div className={styles.resultState}>
          <span className={styles.resultIcon}>{result.error ? '⚠️' : '✅'}</span>
          <div className={styles.resultText}>
            <span className={styles.resultTitle}>
              {result.error ? 'Import Failed' : 'Import Complete'}
            </span>
            <span className={styles.resultDetail}>
              {result.error || (result.imported > 0 ? `+${result.imported} shortcuts imported` : 'No new shortcuts (all duplicates or empty)')}
            </span>
          </div>
          <button className={styles.doneBtn} onClick={onBack}>Done</button>
        </div>
      )}
    </div>
  );
}
