import { useState } from 'react';
import { useSettings } from '../hooks/useSettings';
import { SEARCH_ENGINES } from '../utils/engines';
import styles from '../styles/components/SettingsPanel.module.css';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

export default function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const { settings, updateEngine, updateBackground } = useSettings();
  const [bgType, setBgType] = useState(settings.background.type);
  const [solidColor, setSolidColor] = useState(settings.background.color || '#0a0a0f');

  const handleBgType = (type: 'solid' | 'gradient' | 'image') => {
    setBgType(type);
    updateBackground({ type, color: solidColor });
  };

  return (
    <>
      <div
        className={`${styles.overlay} ${open ? styles.open : ''}`}
        onClick={onClose}
      />
      <div className={`${styles.panel} ${open ? styles.open : ''}`}>
        <div className={styles.header}>
          <span className={styles.title}>Settings</span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close settings">
            <CloseIcon />
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Search Engine</div>
            <div className={styles.engineList}>
              {SEARCH_ENGINES.map((eng) => (
                <div
                  key={eng.id}
                  className={`${styles.engineItem} ${eng.id === settings.defaultEngine ? styles.selected : ''}`}
                  onClick={() => updateEngine(eng.id)}
                >
                  <span dangerouslySetInnerHTML={{ __html: eng.icon }} />
                  <span className={styles.engineName}>{eng.name}</span>
                  {eng.id === settings.defaultEngine && (
                    <span className={styles.checkmark}><CheckIcon /></span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Background</div>
            <div className={styles.bgTypeGrid}>
              <button
                className={`${styles.bgTypeBtn} ${bgType === 'solid' ? styles.active : ''}`}
                onClick={() => handleBgType('solid')}
              >
                Solid
              </button>
              <button
                className={`${styles.bgTypeBtn} ${bgType === 'gradient' ? styles.active : ''}`}
                onClick={() => handleBgType('gradient')}
              >
                Gradient
              </button>
              <button
                className={`${styles.bgTypeBtn} ${bgType === 'image' ? styles.active : ''}`}
                onClick={() => handleBgType('image')}
              >
                Image
              </button>
            </div>
            {bgType === 'solid' && (
              <div className={styles.colorRow}>
                <span className={styles.colorLabel}>Color</span>
                <input
                  type="color"
                  className={styles.colorInput}
                  value={solidColor}
                  onChange={(e) => {
                    setSolidColor(e.target.value);
                    updateBackground({ type: 'solid', color: e.target.value });
                  }}
                />
              </div>
            )}
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Bookmarks</div>
            <button
              className="btn-ghost"
              style={{ width: '100%', marginTop: 4 }}
              onClick={() => {
                // Bookmark import placeholder
                alert('Bookmark import coming soon!');
              }}
            >
              Import Bookmarks
            </button>
          </div>
        </div>

        <div className={styles.aboutSection}>
          BrowserMain v0.1.0
          <div className={styles.version}>LED MATRIX UI</div>
        </div>
      </div>
    </>
  );
}