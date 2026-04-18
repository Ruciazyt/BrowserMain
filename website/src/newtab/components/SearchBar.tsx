import { useState, useRef, useEffect } from 'react';
import { SEARCH_ENGINES, SearchEngine, buildSearchUrl, isUrl } from '../utils/engines';
import styles from '../styles/components/SearchBar.module.css';

interface SearchBarProps {
  defaultEngine?: string;
}

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const ChevronDownIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

export default function SearchBar({ defaultEngine = 'google' }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [engine, setEngine] = useState<SearchEngine>(
    SEARCH_ENGINES.find((e) => e.id === defaultEngine) || SEARCH_ENGINES[0]
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
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

  // Sync engine state when defaultEngine prop changes (e.g., user changed setting)
  useEffect(() => {
    const found = SEARCH_ENGINES.find((e) => e.id === defaultEngine);
    if (found) setEngine(found);
  }, [defaultEngine]);

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
    // If not a URL, do nothing — let browser handle normal paste
  };

  return (
    <>
      <form className={styles.container} onSubmit={handleSubmit}>
        <div className={styles.engineSwitcher} ref={dropdownRef}>
          <button
            type="button"
            className={styles.engineButton}
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-label="Select search engine"
          >
            <span dangerouslySetInnerHTML={{ __html: engine.icon }} />
          </button>
          {dropdownOpen && (
            <div className={styles.dropdown}>
              {SEARCH_ENGINES.map((eng) => (
                <button
                  key={eng.id}
                  type="button"
                  className={`${styles.dropdownItem} ${eng.id === engine.id ? styles.selected : ''}`}
                  onClick={() => {
                    setEngine(eng);
                    setDropdownOpen(false);
                  }}
                >
                  <span dangerouslySetInnerHTML={{ __html: eng.icon }} />
                  {eng.name}
                  {eng.id === engine.id && <CheckIcon />}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className={styles.divider} />
        <input
          ref={inputRef}
          type="text"
          className={styles.input}
          placeholder="Search or enter URL..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onPaste={handlePaste}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
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
        <button type="submit" className={styles.searchBtn} aria-label="Search">
          <SearchIcon />
        </button>
      </form>
      <div className={styles.shortcutHint} aria-hidden="true">
        <kbd className={styles.kbdBadge}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 11, height: 11 }}>
            <rect x="2" y="4" width="20" height="16" rx="2"/>
            <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10"/>
          </svg>
          Ctrl+K
        </kbd>
        <span className={styles.hintText}>to focus</span>
      </div>
    </>
  );
}
