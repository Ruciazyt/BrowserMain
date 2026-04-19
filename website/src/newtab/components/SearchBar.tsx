import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { SEARCH_ENGINES, SearchEngine, buildSearchUrl, isUrl } from '../utils/engines';
import EngineIcon from './EngineIcon';
import { isMac } from '../utils/platform';
import styles from '../styles/components/SearchBar.module.css';

interface SearchBarProps {
  defaultEngine?: string;
  /** 切换搜索引擎时写入 storage，下次打开保留 */
  onEngineChange?: (engineId: string) => void;
}

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const ChevronDownIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

export default function SearchBar({ defaultEngine = 'bing', onEngineChange }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [engine, setEngine] = useState<SearchEngine>(
    SEARCH_ENGINES.find((e) => e.id === defaultEngine) || SEARCH_ENGINES[0]
  );

  useEffect(() => {
    const found = SEARCH_ENGINES.find((e) => e.id === defaultEngine);
    if (found) setEngine(found);
  }, [defaultEngine]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropdownLayout, setDropdownLayout] = useState<{ top: number; left: number; minWidth: number } | null>(null);

  useLayoutEffect(() => {
    if (!dropdownOpen || !dropdownRef.current) {
      setDropdownLayout(null);
      return;
    }
    const update = () => {
      if (!dropdownRef.current) return;
      const rect = dropdownRef.current.getBoundingClientRect();
      setDropdownLayout({
        top: rect.bottom + 8,
        left: rect.left,
        minWidth: Math.max(168, rect.width),
      });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [dropdownOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const t = e.target as Node;
      if (dropdownRef.current?.contains(t) || portalRef.current?.contains(t)) return;
      setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, []);

  const navigateTo = (url: string) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.update(tabs[0].id, { url });
      } else {
        window.location.href = url;
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    const url = isUrl(query.trim()) ? query.trim() : buildSearchUrl(engine, query.trim());
    navigateTo(url);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text');
    if (isUrl(pastedText.trim())) {
      e.preventDefault();
      navigateTo(pastedText.trim());
    }
  };

  const dropdownContent =
    dropdownOpen &&
    dropdownLayout &&
    createPortal(
      <div
        ref={portalRef}
        className={styles.dropdown}
        style={{
          position: 'fixed',
          top: dropdownLayout.top,
          left: dropdownLayout.left,
          minWidth: dropdownLayout.minWidth,
          zIndex: 2147483646,
        }}
      >
        {SEARCH_ENGINES.map((eng) => (
          <button
            key={eng.id}
            type="button"
            className={`${styles.dropdownItem} ${eng.id === engine.id ? styles.selected : ''}`}
            onClick={() => {
              setEngine(eng);
              onEngineChange?.(eng.id);
              setDropdownOpen(false);
            }}
          >
            <EngineIcon engineId={eng.id} variant="onDark" />
            {eng.name}
            {eng.id === engine.id && <CheckIcon />}
          </button>
        ))}
      </div>,
      document.body
    );

  return (
    <div className={styles.outer}>
      <form className={styles.container} onSubmit={handleSubmit}>
        <div className={styles.searchIcon}>
          <SearchIcon />
        </div>
        <div className={styles.engineSwitcher} ref={dropdownRef}>
          <button
            type="button"
            className={styles.engineButton}
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-label="Select search engine"
            aria-expanded={dropdownOpen}
          >
            <EngineIcon engineId={engine.id} />
            <ChevronDownIcon />
          </button>
        </div>
        <div className={styles.divider} />
        <div className={styles.inputWrapper}>
          <input
            ref={inputRef}
            type="text"
            className={styles.input}
            placeholder="在新世界搜索…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onPaste={handlePaste}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          {focused && (
            <div className={styles.shortcutHintInline} aria-hidden="true">
              <kbd className={styles.kbdBadge}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 11, height: 11 }}>
                  <rect x="2" y="4" width="20" height="16" rx="2"/>
                  <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10"/>
                </svg>
                {isMac() ? '⌘K' : 'Ctrl+K'}
              </kbd>
            </div>
          )}
          {query.length > 0 && (
            <button
              type="button"
              className={styles.clearBtn}
              aria-label="Clear search"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>
        <button type="submit" className={styles.searchBtn} aria-label="Search">
          搜索
        </button>
      </form>
      {dropdownContent}
    </div>
  );
}
