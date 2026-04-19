import { useState, useEffect, useRef } from 'react';
import { useShortcuts } from './hooks/useShortcuts';
import { useSettings } from './hooks/useSettings';
import SearchBar from './components/SearchBar';
import Greeting from './components/Greeting';
import Clock from './components/Clock';
import ShortcutGrid from './components/ShortcutGrid';
import SettingsPanel from './components/SettingsPanel';
import AddShortcutDialog from './components/AddShortcutDialog';
import OnboardingGuide from './components/OnboardingGuide';
import './styles/global.css';
import styles from './styles/App.module.css';

const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

export default function App() {
  const { shortcuts, loading: shortcutsLoading, removeShortcut, updateShortcut, reorderShortcuts, refreshShortcuts } = useShortcuts();
  const { settings, loading: settingsLoading, updateEngine } = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [restartOnboardingSignal, setRestartOnboardingSignal] = useState(0);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addDialogData, setAddDialogData] = useState({ url: '', title: '', favicon: '' });

  // On mount, check URL query params for "add shortcut" intent
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const url = params.get('add_url');
    const title = params.get('add_title');
    const favicon = params.get('add_favicon');
    if (url) {
      setAddDialogData({ url: url || '', title: title || '', favicon: favicon || '' });
      setAddDialogOpen(true);
      history.replaceState(null, '', window.location.pathname + window.location.hash);
    }
  }, []);



  // Listen for SHORTCUT_ADDED messages (e.g. from quickadd popup)
  const isMountedRef = useRef(true);
  useEffect(() => {
    const listener = (message: { type?: string }) => {
      if (message.type === 'SHORTCUT_ADDED' && isMountedRef.current) {
        refreshShortcuts();
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => {
      isMountedRef.current = false;
      chrome.runtime.onMessage.removeListener(listener);
    };
  }, [refreshShortcuts]);

  // ESC key to close settings panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && settingsOpen) setSettingsOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [settingsOpen]);

  // Ctrl+Shift+U opens the Add Shortcut dialog directly from the new tab page
  useEffect(() => {
    const handleKeyboardShortcuts = (e: KeyboardEvent) => {
      const modKey = navigator.platform.startsWith('Mac') ? e.metaKey : e.ctrlKey;
      if (modKey && e.shiftKey && e.key.toLowerCase() === 'u') {
        e.preventDefault();
        setAddDialogData({ url: '', title: '', favicon: '' });
        setAddDialogOpen(true);
      }
    };
    document.addEventListener('keydown', handleKeyboardShortcuts);
    return () => document.removeEventListener('keydown', handleKeyboardShortcuts);
  }, []);

  // Apply background settings from user preferences
  useEffect(() => {
    if (settingsLoading) return;
    const { background } = settings;
    if (background.type === 'solid') {
      document.body.style.background = background.color || '#0a0a0f';
    } else if (background.type === 'gradient') {
      const dir = background.gradientDirection || 'to top right';
      document.body.style.background = `linear-gradient(${dir}, ${background.gradientFrom || '#0a0a0f'}, ${background.gradientTo || '#1a3a5c'})`;
    } else {
      // 'image' — blob-scene handles the background; reset body
      document.body.style.background = '';
    }
  }, [settings.background, settingsLoading]);

  if (shortcutsLoading || settingsLoading) {
    return (
      <div className={styles.page}>
        {settings.background.type === 'image' && (
          <div className="blob-scene">
            <div
              className="blob blob-img"
              style={{
                background: `url(${settings.background.imageUrl}) center / cover no-repeat`,
                borderRadius: 0, width: '100vw', height: '100vh', opacity: 0.85,
              }}
            />
          </div>
        )}
        <div className="loading-dots"><span /><span /><span /></div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Animated blob background — only shown for image background type */}
      {settings.background.type === 'image' && (
        <div className="blob-scene">
          <div
            className="blob blob-img"
            style={{
              background: `url(${settings.background.imageUrl}) center / cover no-repeat`,
              borderRadius: 0, width: '100vw', height: '100vh', opacity: 0.85,
            }}
          />
        </div>
      )}

      {/* ── Header: time + greeting + glass search ── */}
      <div className={styles.header}>
<<<<<<< HEAD
        <div className={styles.hero}>
          <Clock />
          <Greeting />
        </div>
        <div className={styles.searchRow}>
          <SearchBar defaultEngine={settings.defaultEngine} onEngineChange={updateEngine} />
        </div>
=======
        <SearchBar defaultEngine={settings.defaultEngine} />
        <Greeting userName={settings.userName} />
>>>>>>> 719059899cef841cb006f7c36bfcc1629f6750ad
      </div>

      {/* 快捷入口：左右各留约 20% 视口边距，中间区域更宽 */}
      <div className={styles.shortcutsWrap}>
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

      {/* ── Settings button ── */}
      <button
        className={styles.settingsBtn}
        onClick={() => setSettingsOpen(true)}
        aria-label="Open settings"
      >
        <SettingsIcon />
      </button>

      {/* ── Settings panel ── */}
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onBookmarkImportComplete={refreshShortcuts}
        onShowTour={() => setRestartOnboardingSignal(Date.now())}
      />

      {/* ── Add shortcut dialog ── */}
      <AddShortcutDialog
        open={addDialogOpen}
        url={addDialogData.url}
        title={addDialogData.title}
        favicon={addDialogData.favicon}
        onClose={() => setAddDialogOpen(false)}
      />

      {/* ── Onboarding ── */}
      <OnboardingGuide restartSignal={restartOnboardingSignal} />

      {/* ── Footer ── */}
      <div className={styles.footer}>
        <span>BrowserMain</span>
      </div>
    </div>
  );
}
