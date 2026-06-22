import { useState, useEffect, useRef, useMemo } from 'react';
import { useShortcuts } from './hooks/useShortcuts';
import { useSettings } from './hooks/useSettings';
import Sidebar from './components/layout/Sidebar/Sidebar';
import SearchBar from './components/SearchBar';
import WeatherWidget from './components/WeatherWidget';
import NewsSection from './components/NewsSection';
import ShortcutGrid from './components/ShortcutGrid';
import AddShortcutDialog from './components/AddShortcutDialog';
import SettingsPanel from './components/settings/SettingsPanel/SettingsPanel';
import RssFeedManager from './components/settings/RssFeedManager/RssFeedManager';
import PixelPet from './components/pet/PixelPet/PixelPet';
import { resolveBackgroundImageUrl } from './utils/backgrounds';
import { GlassDistortionFilter } from './components/ui/Glass';
import './global.css';
import styles from './App.module.css';

export default function App() {
  const { shortcuts, loading: shortcutsLoading, addShortcut, removeShortcut, updateShortcut, reorderShortcuts, refreshShortcuts } = useShortcuts();
  const { settings, loading: settingsLoading, updateEngine } = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsInitialView, setSettingsInitialView] = useState<'main' | 'bookmarkImport' | 'shortcutImport'>('main');
  const [activeNav, setActiveNav] = useState('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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

  const glassStyle = useMemo(() => ({
    '--glass-card-opacity': (settings.glassOpacity ?? 100) / 100,
    '--glass-card-blur': `${settings.glassBlur ?? 3}px`,
    '--glass-card-saturation': `${settings.glassSaturation ?? 140}%`,
    '--glass-card-shadow-intensity': (settings.glassShadowIntensity ?? 100) / 100,
    '--glass-card-tint-color': settings.glassTintColor || '#ffffff',
  }), [settings.glassOpacity, settings.glassBlur, settings.glassSaturation, settings.glassShadowIntensity, settings.glassTintColor]);

  const bgStyle = useMemo(() => {
    const bg = settings.background;
    if (!bg || bg.type === 'solid') return {};
    if (bg.type === 'image') {
      const imageUrl = resolveBackgroundImageUrl(bg);
      if (imageUrl) {
        return {
          backgroundImage: `url(${imageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        };
      }
    }
    if (bg.type === 'gradient') {
      return {
        background: `linear-gradient(${bg.gradientDirection || 'to bottom right'}, ${bg.gradientFrom || '#f5e6d8'}, ${bg.gradientTo || '#e8d5c4'})`,
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

  // Mark unmounted on actual component unmount only — running this in the
  // listener-effect cleanup would also fire whenever `refreshShortcuts` changes,
  // which would leave the ref stuck at false and silently disable the handler.
  useEffect(() => () => { isMountedRef.current = false; }, []);

  useEffect(() => {
    const listener = (message: { type?: string }) => {
      if (message.type === 'SHORTCUT_ADDED' && isMountedRef.current) {
        refreshShortcuts();
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => {
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
    // First-run onboarding was removed — clear any stale flag set by older builds.
    chrome.storage.local.remove('browsermain_first_run');
  }, [settingsLoading]);

  if (shortcutsLoading || settingsLoading) {
    return (
      <div className={styles.page}>
        <div className="loading-dots"><span /><span /><span /></div>
      </div>
    );
  }

  return (
    <div className={styles.page} style={{ ...bgStyle, ...glassStyle } as unknown as React.CSSProperties}>
      <GlassDistortionFilter />
      <Sidebar
        activeNav={activeNav}
        collapsed={sidebarCollapsed}
        onActiveNavChange={setActiveNav}
        onOpenSettings={() => {
          setSettingsInitialView('main');
          setSettingsOpen(true);
        }}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
      />

      <main className={`${styles.main} ${sidebarCollapsed ? styles.mainFull : ''}`}>
        {activeNav === 'rss' ? (
          <RssFeedManager standalone onNavigateHome={() => setActiveNav('home')} />
        ) : (
          <>
            <div className={styles.topBar}>
              <SearchBar defaultEngine={settings.defaultEngine} onEngineChange={updateEngine} />
              <WeatherWidget />
            </div>

            <section className={styles.section}>
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
            </section>

            <section className={styles.section}>
              <NewsSection columns={4} />
            </section>
          </>
        )}
      </main>

      {/* Pixel Pet — fixed bottom right */}
      <div className={styles.petCorner}>
        <PixelPet species={settings.petSpecies || 'brown'} />
      </div>

      {/* Settings panel */}
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        initialView={settingsInitialView}
        onBookmarkImportComplete={refreshShortcuts}
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
    </div>
  );
}
