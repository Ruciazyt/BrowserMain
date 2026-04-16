import { useState, useEffect } from 'react';
import { useShortcuts } from './hooks/useShortcuts';
import { useSettings } from './hooks/useSettings';
import SearchBar from './components/SearchBar';
import Clock from './components/Clock';
import LEDDisplay from './components/LEDDisplay';
import ShortcutGrid from './components/ShortcutGrid';
import SettingsPanel from './components/SettingsPanel';
import AddShortcutDialog from './components/AddShortcutDialog';
import OnboardingGuide from './components/OnboardingGuide';
import './styles/global.css';
import './styles/led-theme.css';
import styles from './styles/App.module.css';

const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

export default function App() {
  const { shortcuts, loading: shortcutsLoading, removeShortcut, updateShortcut, reorderShortcuts, refreshShortcuts } = useShortcuts();
  const { settings, loading: settingsLoading } = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Add shortcut dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addDialogData, setAddDialogData] = useState({ url: '', title: '', favicon: '' });

  // Listen for messages from background script (toolbar button click)
  useEffect(() => {
    const listener = (message: { action?: string; url?: string; title?: string; favicon?: string }) => {
      if (message.action === 'OPEN_ADD_DIALOG') {
        setAddDialogData({
          url: message.url || '',
          title: message.title || '',
          favicon: message.favicon || '',
        });
        setAddDialogOpen(true);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  // ESC key to close settings panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && settingsOpen) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [settingsOpen]);

  if (shortcutsLoading || settingsLoading) {
    return (
      <div className={styles.page} style={{ justifyContent: 'center' }}>
        <div className="led-loading">
          <span /><span /><span />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page} style={{
      background: settings.background.type === 'solid'
        ? settings.background.color
        : settings.background.type === 'gradient'
        ? `linear-gradient(${settings.background.gradientDirection || '135deg'}, ${settings.background.gradientFrom || '#0a0a0f'}, ${settings.background.gradientTo || '#1a1a2e'})`
        : settings.background.type === 'image'
        ? 'none'
        : undefined,
      backgroundImage: settings.background.type === 'image' && settings.background.imageUrl
        ? `url(${settings.background.imageUrl})`
        : undefined,
      backgroundSize: 'cover',
    }}>
      <div className={styles.content}>
        <SearchBar defaultEngine={settings.defaultEngine} />

        <div className={styles.topDecor}>
          <div className={styles.decorLine} />
          <div className={styles.decorDot} />
          <div className={styles.decorDot} style={{ animationDelay: '0.5s' }} />
          <div className={styles.decorLine} style={{ transform: 'scaleX(-1)' }} />
        </div>

        <Clock />

        <LEDDisplay />

        <ShortcutGrid
          shortcuts={shortcuts}
          onDelete={removeShortcut}
          onUpdate={updateShortcut}
          onReorder={reorderShortcuts}
          onAdd={() => {
            setAddDialogData({ url: '', title: '', favicon: '' });
            setAddDialogOpen(true);
          }}
        />
      </div>

      <button
        className={styles.settingsBtn}
        onClick={() => setSettingsOpen(true)}
        aria-label="Open settings"
      >
        <SettingsIcon />
      </button>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} onBookmarkImportComplete={refreshShortcuts} />

      <AddShortcutDialog
        open={addDialogOpen}
        url={addDialogData.url}
        title={addDialogData.title}
        favicon={addDialogData.favicon}
        onClose={() => setAddDialogOpen(false)}
      />

      <OnboardingGuide />

      <div className={styles.footer}>
        <span>BROWSER_MAIN</span>
        <span>v0.1.0</span>
      </div>
    </div>
  );
}
