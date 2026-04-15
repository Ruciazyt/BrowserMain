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
  const [engine, setEngine] = useState<SearchEngine>(
    SEARCH_ENGINES.find((e) => e.id === defaultEngine) || SEARCH_ENGINES[0]
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    const url = isUrl(query.trim()) ? query.trim() : buildSearchUrl(engine, query.trim());
    window.location.href = url;
  };

  return (
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
        type="text"
        className={styles.input}
        placeholder="Search or enter URL..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button type="submit" className={styles.searchBtn} aria-label="Search">
        <SearchIcon />
      </button>
    </form>
  );
}