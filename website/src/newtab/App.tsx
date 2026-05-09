import { useState, useEffect, useRef, useMemo } from 'react';
import { useShortcuts } from './hooks/useShortcuts';
import { useSettings } from './hooks/useSettings';
import SearchBar from './components/SearchBar';
import Greeting from './components/Greeting';
import Clock from './components/Clock';
import ShortcutGrid from './components/ShortcutGrid';
import SettingsPanel from './components/SettingsPanel';
import AddShortcutDialog from './components/AddShortcutDialog';
import OnboardingGuide from './components/OnboardingGuide';
import WeatherWidget from './components/WeatherWidget';
import NewsSection from './components/NewsSection';
import MarketIndices from './components/MarketIndices';
import AIAssistant from './components/AIAssistant';
import AIChatPage from './components/AIChatPage';
import PixelPet from './components/PixelPet';
import { useI18n, type MessageKey } from './i18n';
import './styles/global.css';
import styles from './styles/App.module.css';

const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

const SunIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);

const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
);

const AIChatIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    <path d="M8 9h8"/><path d="M8 13h5"/>
  </svg>
);

const CollapseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
);

const ExpandIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
);

interface NavItem {
  id: string;
  icon: () => React.ReactElement;
}

const navItems: NavItem[] = [
  { id: 'home', icon: HomeIcon },
  { id: 'ai', icon: AIChatIcon },
  { id: 'settings', icon: SettingsIcon },
];

export default function App() {
  const { shortcuts, loading: shortcutsLoading, addShortcut, removeShortcut, updateShortcut, reorderShortcuts, refreshShortcuts } = useShortcuts();
  const { settings, loading: settingsLoading, updateEngine } = useSettings();
  const { t } = useI18n();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsInitialView, setSettingsInitialView] = useState<'main' | 'bookmarkImport' | 'shortcutImport'>('main');
  const [restartOnboardingSignal, setRestartOnboardingSignal] = useState(0);
  const [activeNav, setActiveNav] = useState('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [aiCollapsed, setAiCollapsed] = useState(false);
  const userToggledSidebar = useRef(false);

  // Auto-collapse sidebar on narrow viewports
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 1024px)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) {
        setSidebarCollapsed(true);
      } else if (!userToggledSidebar.current) {
        setSidebarCollapsed(false);
      }
    };
    handler(mql);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addDialogData, setAddDialogData] = useState({ url: '', title: '', favicon: '' });

  const bgStyle = useMemo(() => {
    const bg = settings.background;
    if (!bg || bg.type === 'solid') return {};
    if (bg.type === 'image' && bg.imageUrl) {
      return {
        backgroundImage: `url(${bg.imageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      };
    }
    if (bg.type === 'gradient') {
      return {
        background: `linear-gradient(${bg.gradientDirection || 'to bottom right'}, ${bg.gradientFrom || '#667eea'}, ${bg.gradientTo || '#764ba2'})`,
      };
    }
    return {};
  }, [settings.background]);

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && settingsOpen) setSettingsOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [settingsOpen]);

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

  useEffect(() => {
    if (settingsLoading) return;
    chrome.storage.local.get('browsermain_first_run', (result) => {
      if (result['browsermain_first_run'] === true) {
        setRestartOnboardingSignal(Date.now());
        chrome.storage.local.set({ 'browsermain_first_run': false });
      }
    });
  }, [settingsLoading]);

  if (shortcutsLoading || settingsLoading) {
    return (
      <div className={styles.page}>
        <div className="loading-dots"><span /><span /><span /></div>
      </div>
    );
  }

  return (
    <div className={styles.page} style={bgStyle}>
      {/* ── Sidebar ── */}
      <aside className={`${styles.sidebar} ${sidebarCollapsed ? styles.sidebarCollapsed : ''}`}>
        {!sidebarCollapsed && <div className={styles.sidebarLogo}>BrowserMain</div>}
        <nav className={styles.sidebarNav}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isSettings = item.id === 'settings';
            return (
              <button
                key={item.id}
                className={`${styles.sidebarItem} ${activeNav === item.id && !isSettings ? styles.active : ''}`}
                title={isSettings ? t('settings') : t(`nav_${item.id}` as MessageKey)}
                onClick={() => {
                  if (isSettings) {
                    setSettingsInitialView('main');
                    setSettingsOpen(true);
                  } else {
                    setActiveNav(item.id);
                  }
                }}
              >
                <span className={styles.sidebarItemIcon}><Icon /></span>
                {!sidebarCollapsed && (isSettings ? t('settings') : t(`nav_${item.id}` as MessageKey))}
              </button>
            );
          })}
        </nav>
        <div className={styles.sidebarBottom}>
          <button className={styles.sidebarIconBtn} onClick={() => { userToggledSidebar.current = true; setSidebarCollapsed(!sidebarCollapsed); }} aria-label="Toggle sidebar" title="Toggle sidebar">
            {sidebarCollapsed ? <ExpandIcon /> : <CollapseIcon />}
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className={`${styles.main} ${sidebarCollapsed ? styles.mainFull : ''}`}>
        {activeNav === 'ai' ? (
          <AIChatPage />
        ) : (
          <>
            {/* Header: Clock + Greeting (left) | Weather (right) */}
            <div className={styles.header}>
              <div className={styles.heroGroup}>
                <Clock />
                <Greeting userName={settings.userName} />
              </div>
              <div className={styles.headerRight}>
                <WeatherWidget />
              </div>
            </div>

            {/* Search bar + Market indices row */}
            <div className={styles.searchRow}>
              <SearchBar defaultEngine={settings.defaultEngine} onEngineChange={updateEngine} />
              <MarketIndices />
            </div>

            {/* Shortcuts (left) + News (center) + AI (right) */}
            <div className={styles.contentRow}>
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
                  onImportBookmarks={() => {
                    setSettingsInitialView('bookmarkImport');
                    setSettingsOpen(true);
                  }}
                  onImportShortcuts={() => {
                    setSettingsInitialView('shortcutImport');
                    setSettingsOpen(true);
                  }}
                />
              </div>
              <div className={styles.newsWrap}>
                <NewsSection columns={aiCollapsed ? 3 : 2} />
              </div>
              <div className={`${styles.aiWrap} ${aiCollapsed ? styles.aiWrapCollapsed : ''}`}>
                <AIAssistant collapsed={aiCollapsed} onToggle={() => setAiCollapsed(!aiCollapsed)} />
                {!aiCollapsed && <PixelPet species={settings.petSpecies || 'brown'} />}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Settings panel */}
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        initialView={settingsInitialView}
        onBookmarkImportComplete={refreshShortcuts}
        onShowTour={() => setRestartOnboardingSignal(Date.now())}
      />

      {/* Add shortcut dialog */}
      <AddShortcutDialog
        open={addDialogOpen}
        shortcuts={shortcuts}
        url={addDialogData.url}
        title={addDialogData.title}
        favicon={addDialogData.favicon}
        onAddShortcut={addShortcut}
        onClose={() => setAddDialogOpen(false)}
      />

      {/* Onboarding */}
      <OnboardingGuide restartSignal={restartOnboardingSignal} />
    </div>
  );
}
