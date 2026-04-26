import { useState, useRef, useEffect } from 'react';
import pkg from '../../../package.json';
import { useSettings } from '../hooks/useSettings';
import { SEARCH_ENGINES } from '../utils/engines';
import { useI18n } from '../i18n';
import EngineIcon from './EngineIcon';
import BookmarkImport from './BookmarkImport';
import ShortcutImport from './ShortcutImport';
import { useShortcuts } from '../hooks/useShortcuts';
import { getAIKey, saveAIKey, clearAIKey } from '../utils/aiStorage';
import styles from '../styles/components/SettingsPanel.module.css';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  initialView?: 'main' | 'bookmarkImport' | 'shortcutImport';
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

export default function SettingsPanel({ open, onClose, initialView = 'main', onBookmarkImportComplete }: SettingsPanelProps) {
  const { settings, updateEngine, updateBackground, updateClockFormat, updateLocale, updateAIConfig } = useSettings();
  const { t } = useI18n();
  const { shortcuts, updateShortcut } = useShortcuts();
  const [imagePreview, setImagePreview] = useState(settings.background.imageUrl || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showBookmarkImport, setShowBookmarkImport] = useState(false);
  const [showShortcutImport, setShowShortcutImport] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showClearSuccess, setShowClearSuccess] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null);
  const [groupDeleteSuccess, setGroupDeleteSuccess] = useState('');

  // AI settings state
  const [aiKey, setAiKey] = useState('');
  const [aiKeyVisible, setAiKeyVisible] = useState(false);
  const [aiTesting, setAiTesting] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<'success' | 'error' | null>(null);
  const [aiTestError, setAiTestError] = useState('');

  const existingGroups = Array.from(
    new Set(shortcuts.map((s) => s.group).filter((g): g is string => !!g))
  ).sort();

  useEffect(() => {
    if (!open) return;
    getAIKey().then(setAiKey);
    setAiTestResult(null);
    setAiTestError('');
    setShowBookmarkImport(initialView === 'bookmarkImport');
    setShowShortcutImport(initialView === 'shortcutImport');
  }, [open, initialView]);

  useEffect(() => {
    setImagePreview(settings.background.imageUrl || '');
  }, [settings.background.imageUrl]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setImagePreview(dataUrl);
      updateBackground({ type: 'image', imageUrl: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      <div
        className={`${styles.overlay} ${open ? styles.open : ''}`}
        onClick={onClose}
      />
      <div className={`${styles.panel} ${open ? styles.open : ''}`}>
        <div className={styles.header}>
          <span className={styles.title}>{t('settings')}</span>
          <button className={styles.closeBtn} onClick={onClose} aria-label={t('close')}>
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
                <div className={styles.sectionTitle}>{t('searchEngine')}</div>
                <div className={styles.engineList}>
                  {SEARCH_ENGINES.map((eng) => (
                    <div
                      key={eng.id}
                      className={`${styles.engineItem} ${eng.id === settings.defaultEngine ? styles.selected : ''}`}
                      onClick={() => updateEngine(eng.id)}
                    >
                      <EngineIcon engineId={eng.id} />
                      <span className={styles.engineName}>{eng.name}</span>
                      {eng.id === settings.defaultEngine && (
                        <span className={styles.checkmark}><CheckIcon /></span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.section}>
                <div className={styles.sectionTitle}>{t('background')}</div>
                <div className={styles.imageSection}>
                  <div className={styles.imageHelpText}>{t('backgroundDescription')}</div>
                  <div className={styles.imageActionRow}>
                    <button
                      className={styles.uploadBtn}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {imagePreview ? t('replaceBackground') : t('uploadBackground')}
                    </button>
                    {imagePreview && (
                      <button
                        className={styles.removeImageBtnInline}
                        onClick={() => {
                          setImagePreview('');
                          updateBackground({ type: 'solid', color: '#0a0a0f' });
                        }}
                      >
                        {t('removeBackground')}
                      </button>
                    )}
                  </div>
                  {imagePreview ? (
                    <div className={styles.imagePreviewArea}>
                      <img src={imagePreview} alt={t('backgroundPreviewAlt')} />
                    </div>
                  ) : (
                    <div className={styles.emptyBackgroundState}>{t('noBackgroundImage')}</div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />
              </div>

              <div className={styles.section}>
                <div className={styles.sectionTitle}>{t('bookmarks')}</div>
                <button
                  className={styles.importBtn}
                  style={{ width: '100%', marginTop: 4 }}
                  onClick={() => setShowBookmarkImport(true)}
                >
                  {t('importBookmarks')}
                </button>
                <button
                  className={styles.importBtn}
                  onClick={() => setShowShortcutImport(true)}
                >
                  {t('importShortcuts')}
                </button>
                {!showClearConfirm && !showClearSuccess && (
                  <button
                    className={styles.clearAllBtn}
                    onClick={() => setShowClearConfirm(true)}
                  >
                    {t('clearAllShortcuts')}
                  </button>
                )}
              </div>

              <div className={styles.section}>
                <div className={styles.sectionTitle}>{t('groups')}</div>
                {existingGroups.length === 0 ? (
                  <div className={styles.noGroupsHint}>
                    {t('noGroupsHint')}
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
                            aria-label={`${t('delete')} ${groupName}`}
                            title={t('removeGroupConfirm', { group: groupName })}
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
                      {t('removeGroupConfirm', { group: groupToDelete })}
                    </span>
                    <div className={styles.groupConfirmBtns}>
                      <button
                        className={styles.groupCancelBtn}
                        onClick={() => setGroupToDelete(null)}
                      >
                        {t('cancel')}
                      </button>
                      <button
                        className={styles.groupConfirmBtn}
                        onClick={async () => {
                          const toUpdate = shortcuts.filter((s) => s.group === groupToDelete);
                          for (const shortcut of toUpdate) {
                            await updateShortcut(shortcut.id, { group: undefined });
                          }
                          setGroupToDelete(null);
                          setGroupDeleteSuccess(t('groupRemoved', { group: groupToDelete, count: toUpdate.length }));
                          setTimeout(() => setGroupDeleteSuccess(''), 2500);
                          onBookmarkImportComplete?.();
                        }}
                      >
                        {t('confirm')}
                      </button>
                    </div>
                  </div>
                )}
                {groupDeleteSuccess && (
                  <div className={styles.successMessage}>{groupDeleteSuccess}</div>
                )}
                {showClearConfirm && (
                  <div className={styles.confirmState}>
                    <span className={styles.confirmText}>{t('clearAllShortcutsConfirm')}</span>
                    <div className={styles.confirmBtnRow}>
                      <button
                        className={styles.confirmCancelBtn}
                        onClick={() => setShowClearConfirm(false)}
                      >
                        {t('cancel')}
                      </button>
                      <button
                        className={styles.confirmDangerBtn}
                        onClick={async () => {
                          await new Promise<void>((resolve) => {
                            chrome.storage.local.set({ 'browsermain_shortcuts': [] }, () => resolve());
                          });
                          onBookmarkImportComplete?.();
                          setShowClearConfirm(false);
                          setShowClearSuccess(true);
                          setTimeout(() => setShowClearSuccess(false), 2500);
                        }}
                      >
                        {t('confirm')}
                      </button>
                    </div>
                  </div>
                )}
                {showClearSuccess && (
                  <div className={styles.successMessage}>✓ {t('allShortcutsCleared')}</div>
                )}
              </div>

              <div className={styles.section}>
                <div className={styles.sectionTitle}>{t('preferences')}</div>
                <div className={styles.languageRow}>
                  <span className={styles.languageLabel}>{t('language')}</span>
                  <div className={styles.languageToggle}>
                    <button
                      className={`${styles.languageBtn} ${settings.locale === 'system' ? styles.active : ''}`}
                      onClick={() => updateLocale('system')}
                    >
                      {t('systemLanguage')}
                    </button>
                    <button
                      className={`${styles.languageBtn} ${settings.locale === 'zh-CN' ? styles.active : ''}`}
                      onClick={() => updateLocale('zh-CN')}
                    >
                      {t('chinese')}
                    </button>
                    <button
                      className={`${styles.languageBtn} ${settings.locale === 'en' ? styles.active : ''}`}
                      onClick={() => updateLocale('en')}
                    >
                      {t('english')}
                    </button>
                  </div>
                </div>
                <div className={styles.clockFormatRow}>
                  <span className={styles.clockFormatLabel}>{t('clockFormat')}</span>
                  <div className={styles.clockFormatToggle}>
                    <button
                      className={`${styles.clockFormatBtn} ${settings.clockIs24h !== false ? styles.active : ''}`}
                      onClick={() => updateClockFormat(true)}
                    >
                      24H
                    </button>
                    <button
                      className={`${styles.clockFormatBtn} ${settings.clockIs24h === false ? styles.active : ''}`}
                      onClick={() => updateClockFormat(false)}
                    >
                      12H
                    </button>
                  </div>
                </div>
              </div>

              <div className={styles.section}>
                <div className={styles.sectionTitle}>{t('aiSettings')}</div>

                <div className={styles.fieldRow}>
                  <label className={styles.fieldLabel}>{t('aiEndpoint')}</label>
                  <input
                    className={styles.fieldInput}
                    value={settings.aiEndpoint || ''}
                    onChange={(e) => updateAIConfig({ aiEndpoint: e.target.value })}
                    placeholder={t('aiEndpointPlaceholder')}
                  />
                </div>

                <div className={styles.fieldRow}>
                  <label className={styles.fieldLabel}>{t('aiApiKey')}</label>
                  <div style={{ display: 'flex', gap: 6, flex: 1 }}>
                    <input
                      className={styles.fieldInput}
                      type={aiKeyVisible ? 'text' : 'password'}
                      value={aiKey}
                      onChange={(e) => { setAiKey(e.target.value); saveAIKey(e.target.value); }}
                      placeholder={t('aiApiKeyPlaceholder')}
                      style={{ flex: 1 }}
                    />
                    <button
                      className={styles.eyeBtn}
                      onClick={() => setAiKeyVisible(!aiKeyVisible)}
                      aria-label="Toggle visibility"
                    >
                      {aiKeyVisible ? '⊙' : '◉'}
                    </button>
                  </div>
                </div>

                <div className={styles.fieldRow}>
                  <label className={styles.fieldLabel}>{t('aiModel')}</label>
                  <input
                    className={styles.fieldInput}
                    value={settings.aiModel || ''}
                    onChange={(e) => updateAIConfig({ aiModel: e.target.value })}
                    placeholder={t('aiModelPlaceholder')}
                  />
                </div>

                <div className={styles.fieldRow}>
                  <label className={styles.fieldLabel}>{t('aiTemperature')}: {settings.aiTemperature ?? 0.7}</label>
                  <input
                    type="range" min="0" max="2" step="0.1"
                    value={settings.aiTemperature ?? 0.7}
                    onChange={(e) => updateAIConfig({ aiTemperature: parseFloat(e.target.value) })}
                    style={{ width: '100%' }}
                  />
                </div>

                <div className={styles.fieldRow}>
                  <label className={styles.fieldLabel}>{t('aiMaxTokens')}</label>
                  <input
                    type="number"
                    className={styles.fieldInput}
                    value={settings.aiMaxTokens || ''}
                    onChange={(e) => updateAIConfig({ aiMaxTokens: e.target.value ? parseInt(e.target.value) : undefined })}
                    placeholder={t('aiMaxTokensPlaceholder')}
                  />
                </div>

                <button
                  className={styles.testBtn}
                  onClick={async () => {
                    const key = await getAIKey();
                    if (!settings.aiEndpoint || !key) return;
                    setAiTesting(true);
                    setAiTestResult(null);
                    setAiTestError('');
                    chrome.runtime.sendMessage({
                      type: 'AI_CHAT',
                      endpoint: settings.aiEndpoint,
                      apiKey: key,
                      model: settings.aiModel || 'gpt-4o',
                      messages: [{ role: 'user', content: 'Hi' }],
                      maxTokens: 5,
                    }, (res: { success?: boolean; content?: string; error?: string }) => {
                      setAiTesting(false);
                      if (res.success) {
                        setAiTestResult('success');
                      } else {
                        setAiTestResult('error');
                        setAiTestError(res.error || 'Unknown error');
                      }
                    });
                  }}
                  disabled={aiTesting || !settings.aiEndpoint || !aiKey}
                >
                  {aiTesting ? t('aiTesting') : t('aiTestConnection')}
                </button>
                {aiTestResult === 'success' && (
                  <div className={styles.successMsg}>{t('aiTestSuccess')}</div>
                )}
                {aiTestResult === 'error' && (
                  <div className={styles.errorMsg}>{t('aiTestFailed')}: {aiTestError}</div>
                )}
              </div>

              <div className={styles.section}>
                <div className={styles.sectionTitle}>{t('keyboardShortcuts')}</div>
                <div className={styles.shortcutsList}>
                  <div className={styles.shortcutRow}>
                    <div className={styles.shortcutKeys}>
                      <kbd className={styles.kbd}>Ctrl</kbd><span className={styles.kbdSep}>+</span><kbd className={styles.kbd}>K</kbd>
                      <span className={styles.kbdOr}>/</span>
                      <kbd className={styles.kbd}>⌘K</kbd>
                    </div>
                    <span className={styles.shortcutDesc}>{t('focusSearchBar')}</span>
                  </div>
                  <div className={styles.shortcutRow}>
                    <div className={styles.shortcutKeys}>
                      <kbd className={styles.kbd}>←</kbd>
                      <kbd className={styles.kbd}>→</kbd>
                      <kbd className={styles.kbd}>↑</kbd>
                      <kbd className={styles.kbd}>↓</kbd>
                    </div>
                    <span className={styles.shortcutDesc}>{t('navigateShortcuts')}</span>
                  </div>
                  <div className={styles.shortcutRow}>
                    <div className={styles.shortcutKeys}>
                      <kbd className={styles.kbd}>Enter</kbd>
                      <span className={styles.kbdSep}>/</span>
                      <kbd className={styles.kbd}>Space</kbd>
                    </div>
                    <span className={styles.shortcutDesc}>{t('openShortcut')}</span>
                  </div>
                  <div className={styles.shortcutRow}>
                    <div className={styles.shortcutKeys}>
                      <kbd className={styles.kbd}>Ctrl</kbd><span className={styles.kbdSep}>+</span><kbd className={styles.kbd}>⇧</kbd><span className={styles.kbdSep}>+</span><kbd className={styles.kbd}>U</kbd>
                      <span className={styles.kbdOr}>/</span>
                      <kbd className={styles.kbd}>⌘⇧U</kbd>
                    </div>
                    <span className={styles.shortcutDesc}>{t('openAddShortcutDialog')}</span>
                  </div>
                  <div className={styles.shortcutRow}>
                    <div className={styles.shortcutKeys}>
                      <kbd className={styles.kbd}>Esc</kbd>
                    </div>
                    <span className={styles.shortcutDesc}>{t('closeSettingsPanel')}</span>
                  </div>
                  <div className={styles.shortcutRow}>
                    <div className={styles.shortcutKeys}>
                      <kbd className={styles.kbd}>Right-click</kbd>
                    </div>
                    <span className={styles.shortcutDesc}>{t('editDeleteShortcut')}</span>
                  </div>
                </div>
              </div>

              <div className={styles.section}>
                <div className={styles.sectionTitle}>{t('about')}</div>
                <div className={styles.aboutVersion}>{t('version', { version: pkg.version })}</div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
