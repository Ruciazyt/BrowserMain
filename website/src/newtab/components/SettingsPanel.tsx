import { useState, useRef, useEffect } from 'react';
import { useSettings } from '../hooks/useSettings';
import { SEARCH_ENGINES } from '../utils/engines';
import BookmarkImport from './BookmarkImport';
import ShortcutImport from './ShortcutImport';
import { useShortcuts } from '../hooks/useShortcuts';
import { exportShortcutsAsJson } from '../hooks/useShortcuts';
import styles from '../styles/components/SettingsPanel.module.css';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  onBookmarkImportComplete?: () => void;
  onShowTour?: () => void;
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
  { label: '↗', value: 'to top right' },
  { label: '↘', value: 'to bottom right' },
  { label: '↙', value: 'to bottom left' },
  { label: '↖', value: 'to top left' },
];

export default function SettingsPanel({ open, onClose, onBookmarkImportComplete, onShowTour }: SettingsPanelProps) {
  const { settings, updateEngine, updateBackground, updateUserName, updateClockFormat } = useSettings();
  const { shortcuts, refreshShortcuts, updateShortcut } = useShortcuts();
  const [bgType, setBgType] = useState(settings.background.type);
  const [solidColor, setSolidColor] = useState(settings.background.color || '#0a0a0f');
  const [gradientFrom, setGradientFrom] = useState(settings.background.gradientFrom || '#0a0a0f');
  const [gradientTo, setGradientTo] = useState(settings.background.gradientTo || '#1a3a5c');
  const [gradientDirection, setGradientDirection] = useState(settings.background.gradientDirection || 'to top right');
  const [imageUrl, setImageUrl] = useState(settings.background.imageUrl || '');
  const [imagePreview, setImagePreview] = useState(settings.background.imageUrl || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showBookmarkImport, setShowBookmarkImport] = useState(false);
  const [showShortcutImport, setShowShortcutImport] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showClearSuccess, setShowClearSuccess] = useState(false);
  const [tourCompleted, setTourCompleted] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [groupDeleteSuccess, setGroupDeleteSuccess] = useState('');

  // Unique groups sorted alphabetically
  const existingGroups = Array.from(
    new Set(shortcuts.map((s) => s.group).filter((g): g is string => !!g))
  ).sort();

  useEffect(() => {
    chrome.storage.local.get('onboardingComplete', (result) => {
      setTourCompleted(result.onboardingComplete === true);
    });
  }, []);

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
            <BookmarkImport onBack={() => setShowBookmarkImport(false)} onImported={onBookmarkImportComplete} />
          ) : showShortcutImport ? (
            <ShortcutImport onBack={() => setShowShortcutImport(false)} onImported={onBookmarkImportComplete} />
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
                            updateBackground({ type: 'gradient', gradientFrom, gradientTo, gradientDirection: dir.value as 'to top right' | 'to bottom right' | 'to bottom left' | 'to top left' });
                          }}
                        >
                          {dir.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {bgType === 'image' && (
                  <div className={styles.imageSection}>
                    <div className={styles.imageRow}>
                      <div className={styles.imageInputWrapper}>
                        <input
                          type="text"
                          className={styles.imageInput}
                          placeholder="Image URL..."
                          value={imageUrl}
                          onChange={(e) => {
                            setImageUrl(e.target.value);
                            setImagePreview(e.target.value);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              updateBackground({ type: 'image', imageUrl });
                            }
                          }}
                        />
                        {imageUrl && (
                          <button
                            className={styles.clearImageBtn}
                            onClick={() => {
                              setImageUrl('');
                              setImagePreview('');
                            }}
                            aria-label="Clear URL"
                          >
                            ×
                          </button>
                        )}
                      </div>
                      <button
                        className={styles.uploadBtn}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Upload
                      </button>
                      <button
                        className={`${styles.applyBtn} ${imageUrl !== settings.background.imageUrl ? styles.applyBtnDirty : ''}`}
                        onClick={() => updateBackground({ type: 'image', imageUrl })}
                      >
                        Apply
                      </button>
                    </div>
                    {imagePreview && (
                      <div className={styles.imagePreviewArea}>
                        <img src={imagePreview} alt="Background preview" />
                        <button
                          className={styles.removeImageBtn}
                          onClick={() => {
                            setImagePreview('');
                            setImageUrl('');
                            updateBackground({ type: 'solid', color: solidColor });
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    )}
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
                <div className={styles.shortcutActionRow}>
                  <button
                    className={styles.exportBtn}
                    onClick={() => exportShortcutsAsJson()}
                  >
                    Export
                  </button>
                  <button
                    className={styles.importBtn}
                    onClick={() => setShowShortcutImport(true)}
                  >
                    Import
                  </button>
                </div>
                {!showClearConfirm && !showClearSuccess && (
                  <button
                    className={styles.clearAllBtn}
                    onClick={() => setShowClearConfirm(true)}
                  >
                    Clear All Shortcuts
                  </button>
                )}
              </div>

              {/* Groups section */}
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Groups</div>
                {existingGroups.length === 0 ? (
                  <div className={styles.noGroupsHint}>
                    No groups yet. Groups are created when you assign one to a shortcut.
                  </div>
                ) : (
                  <div className={styles.groupList}>
                    {existingGroups.map((groupName) => {
                      const count = shortcuts.filter((s) => s.group === groupName).length;
                      return (
                        <div key={groupName} className={styles.groupRow}>
                          <span className={styles.groupRowName}>{groupName}</span>
                          <span className={styles.groupRowCount}>{count}</span>
                          <button
                            className={styles.groupDeleteBtn}
                            onClick={async () => {
                              setGroupToDelete(groupName);
                            }}
                            aria-label={`Delete group ${groupName}`}
                            title={`Remove "${groupName}" from all shortcuts`}
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                {groupToDelete && (
                  <div className={styles.groupConfirmState}>
                    <span className={styles.groupConfirmText}>
                      Remove group <strong>"{groupToDelete}"</strong> from all shortcuts?
                    </span>
                    <div className={styles.groupConfirmBtns}>
                      <button
                        className={styles.groupCancelBtn}
                        onClick={() => setGroupToDelete(null)}
                      >
                        Cancel
                      </button>
                      <button
                        className={styles.groupConfirmBtn}
                        onClick={async () => {
                          // Remove group from all shortcuts in this group
                          const toUpdate = shortcuts.filter((s) => s.group === groupToDelete);
                          for (const s of toUpdate) {
                            await updateShortcut(s.id, { group: undefined });
                          }
                          setGroupToDelete(null);
                          setGroupDeleteSuccess(`"${groupToDelete}" removed from ${toUpdate.length} shortcut(s)`);
                          setTimeout(() => setGroupDeleteSuccess(''), 2500);
                          onBookmarkImportComplete?.();
                        }}
                      >
                        Confirm
                      </button>
                    </div>
                  </div>
                )}
                {groupDeleteSuccess && (
                  <div className={styles.successMessage}>{groupDeleteSuccess}</div>
                )}
                {showClearConfirm && (
                  <div className={styles.confirmState}>
                    <span className={styles.confirmText}>Are you sure? This will delete all shortcuts.</span>
                    <div className={styles.confirmBtnRow}>
                      <button
                        className={styles.confirmCancelBtn}
                        onClick={() => setShowClearConfirm(false)}
                      >
                        Cancel
                      </button>
                      <button
                        className={styles.confirmDangerBtn}
                        onClick={async () => {
                          // Clear shortcuts via chrome.storage directly
                          await new Promise<void>((resolve) => {
                            chrome.storage.local.set({ 'browsermain_shortcuts': [] }, () => resolve());
                          });
                          onBookmarkImportComplete?.();
                          setShowClearConfirm(false);
                          setShowClearSuccess(true);
                          setTimeout(() => setShowClearSuccess(false), 2500);
                        }}
                      >
                        Confirm
                      </button>
                    </div>
                  </div>
                )}
                {showClearSuccess && (
                  <div className={styles.successMessage}>✓ All shortcuts cleared</div>
                )}
              </div>

              <div className={styles.section}>
                <div className={styles.sectionTitle}>About</div>
                <div className={styles.displayNameRow}>
                  <span className={styles.displayNameLabel}>Display Name</span>
                  <input
                    type="text"
                    className={styles.displayNameInput}
                    placeholder="Your name..."
                    defaultValue={settings.userName || ''}
                    onBlur={(e) => updateUserName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        updateUserName((e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                  />
                </div>
                <div className={styles.clockFormatRow}>
                  <span className={styles.clockFormatLabel}>Clock Format</span>
                  <div className={styles.clockFormatToggle}>
                    <button
                      className={`${styles.clockFormatBtn} ${settings.clockIs24h !== false ? styles.active : ''}`}
                      onClick={() => {
                        updateClockFormat(true);
                      }}
                    >
                      24H
                    </button>
                    <button
                      className={`${styles.clockFormatBtn} ${settings.clockIs24h === false ? styles.active : ''}`}
                      onClick={() => {
                        updateClockFormat(false);
                      }}
                    >
                      12H
                    </button>
                  </div>
                </div>
                <div className={styles.aboutVersion}>BrowserMain v0.1.0</div>
                <div className={styles.version}>LED MATRIX UI</div>
                <button
                  className={styles.showTourBtn}
                  onClick={onShowTour}
                  style={{ marginTop: 12, width: '100%' }}
                  title="Replay the onboarding tour"
                >
                  <span className={styles.tourIcon}>◉</span> {tourCompleted ? 'Replay Tour' : 'Show Tour'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
