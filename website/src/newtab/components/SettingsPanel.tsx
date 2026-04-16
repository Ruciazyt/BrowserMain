import { useState, useRef } from 'react';
import { useSettings } from '../hooks/useSettings';
import { SEARCH_ENGINES } from '../utils/engines';
import BookmarkImport from './BookmarkImport';
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

const GRADIENT_DIRECTIONS = [
  { label: '↗', value: 'to right top' },
  { label: '↘', value: 'to right bottom' },
  { label: '↙', value: 'to left bottom' },
  { label: '↖', value: 'to left top' },
];

export default function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const { settings, updateEngine, updateBackground } = useSettings();
  const [bgType, setBgType] = useState(settings.background.type);
  const [solidColor, setSolidColor] = useState(settings.background.color || '#0a0a0f');
  const [gradientFrom, setGradientFrom] = useState(settings.background.gradientFrom || '#0a0a0f');
  const [gradientTo, setGradientTo] = useState(settings.background.gradientTo || '#1a3a5c');
  const [gradientDirection, setGradientDirection] = useState(settings.background.gradientDirection || 'to right top');
  const [imageUrl, setImageUrl] = useState(settings.background.imageUrl || '');
  const [imagePreview, setImagePreview] = useState(settings.background.imageUrl || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showBookmarkImport, setShowBookmarkImport] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setImagePreview(dataUrl);
      setImageUrl(dataUrl);
      updateBackground({ type: 'image', imageUrl: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const handleBgType = (type: 'solid' | 'gradient' | 'image') => {
    setBgType(type);
    if (type === 'solid') {
      updateBackground({ type, color: solidColor });
    } else if (type === 'gradient') {
      updateBackground({ type, gradientFrom, gradientTo, gradientDirection });
    } else if (type === 'image') {
      updateBackground({ type, imageUrl });
    }
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
          {showBookmarkImport ? (
            <BookmarkImport onBack={() => setShowBookmarkImport(false)} />
          ) : (
            <>
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
                {bgType === 'gradient' && (
                  <div className={styles.gradientSection}>
                    <div className={styles.colorRow}>
                      <span className={styles.colorLabel}>From</span>
                      <input
                        type="color"
                        className={styles.colorInput}
                        value={gradientFrom}
                        onChange={(e) => {
                          setGradientFrom(e.target.value);
                          updateBackground({ type: 'gradient', gradientFrom: e.target.value, gradientTo, gradientDirection });
                        }}
                      />
                      <span className={styles.colorLabel} style={{ marginLeft: 12 }}>To</span>
                      <input
                        type="color"
                        className={styles.colorInput}
                        value={gradientTo}
                        onChange={(e) => {
                          setGradientTo(e.target.value);
                          updateBackground({ type: 'gradient', gradientFrom, gradientTo: e.target.value, gradientDirection });
                        }}
                      />
                    </div>
                    <div className={styles.directionRow}>
                      {GRADIENT_DIRECTIONS.map((dir) => (
                        <button
                          key={dir.value}
                          className={`${styles.directionBtn} ${gradientDirection === dir.value ? styles.active : ''}`}
                          onClick={() => {
                            setGradientDirection(dir.value as typeof gradientDirection);
                            updateBackground({ type: 'gradient', gradientFrom, gradientTo, gradientDirection: dir.value as 'to right top' | 'to right bottom' | 'to left bottom' | 'to left top' });
                          }}
                        >
                          {dir.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {bgType === 'image' && (
                  <div className={styles.imageRow}>
                    <input
                      type="text"
                      className={styles.imageInput}
                      placeholder="Image URL..."
                      value={imageUrl}
                      onChange={(e) => {
                        setImageUrl(e.target.value);
                        setImagePreview(e.target.value);
                      }}
                    />
                    <button
                      className={styles.uploadBtn}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Upload
                    </button>
                    <button
                      className={styles.applyBtn}
                      onClick={() => updateBackground({ type: 'image', imageUrl })}
                    >
                      Apply
                    </button>
                  </div>
                )}
                {bgType === 'image' && imagePreview && (
                  <div className={styles.imagePreview}>
                    <img src={imagePreview} alt="Background preview" />
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />
              </div>

              <div className={styles.section}>
                <div className={styles.sectionTitle}>Bookmarks</div>
                <button
                  className={styles.importBtn}
                  style={{ width: '100%', marginTop: 4 }}
                  onClick={() => setShowBookmarkImport(true)}
                >
                  Import Bookmarks
                </button>
              </div>

              <div className={styles.section}>
                <div className={styles.sectionTitle}>About</div>
                <div className={styles.aboutVersion}>BrowserMain v0.1.0</div>
                <div className={styles.version}>LED MATRIX UI</div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
