import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { getSmartFaviconUrl, getFaviconIcoUrl, getDomainFromUrl, getChromeFaviconUrl } from '../utils/storage';
import { isMac } from '../utils/platform';
import { isUrl } from '../utils/engines';
import { Shortcut } from '../utils/storage';
import { useI18n } from '../i18n';
import styles from '../styles/components/ShortcutTile.module.css';

const GlobeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={styles.iconFallback}>
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);

interface ShortcutTileProps {
  shortcut: Shortcut;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Shortcut>) => void;
  index: number;
  onMoveLeft?: (index: number) => void;
  onMoveRight?: (index: number) => void;
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
  onAdd?: () => void;
  existingGroups?: string[];
  isGroupPreviewTarget?: boolean;
  isGlobalEditing?: boolean;
  onEnterEditMode?: () => void;
}

export default function ShortcutTile({
  shortcut,
  onDelete,
  onUpdate,
  index,
  onMoveLeft,
  onMoveRight,
  onMoveUp,
  onMoveDown,
  onAdd,
  existingGroups,
  isGroupPreviewTarget,
  isGlobalEditing,
  onEnterEditMode,
}: ShortcutTileProps) {
  const { t } = useI18n();
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [showMoveSubmenu, setShowMoveSubmenu] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState(shortcut.title);
  const [editUrl, setEditUrl] = useState(shortcut.url);
  const [editGroup, setEditGroup] = useState(shortcut.group || '');
  const [editFaviconSrc, setEditFaviconSrc] = useState(shortcut.favicon || getSmartFaviconUrl(shortcut.url));
  const [editFaviconTriedIco, setEditFaviconTriedIco] = useState(false);
  const [editError, setEditError] = useState(false);
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [focusGroupFieldOnEdit, setFocusGroupFieldOnEdit] = useState(false);
  const [faviconSrc, setFaviconSrc] = useState(shortcut.favicon || getSmartFaviconUrl(shortcut.url));
  const [faviconTriedIco, setFaviconTriedIco] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const groupInputRef = useRef<HTMLInputElement>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  const longPressMovedRef = useRef(false);

  // Try Chrome's native favicons API when no stored favicon exists — async, non-blocking.
  // Falls back to Google S2 for the initial render to avoid empty icons.
  useEffect(() => {
    if (shortcut.favicon) {
      // Shortcut has a stored favicon — use it; handleFaviconError will handle the fallback chain
      setFaviconSrc(shortcut.favicon);
      setFaviconTriedIco(false);
      return;
    }
    // No stored favicon — start with Google S2 immediately, then try Chrome API for better quality
    const googleFavicon = getSmartFaviconUrl(shortcut.url);
    setFaviconSrc(googleFavicon);
    setFaviconTriedIco(false);
    // Attempt Chrome API for a native-quality favicon; update state if it returns a result
    let cancelled = false;
    getChromeFaviconUrl(shortcut.url).then((chromeFavicon) => {
      if (!cancelled && chromeFavicon && chromeFavicon !== googleFavicon) {
        setFaviconSrc(chromeFavicon);
        // Persist the improved favicon so future renders don't need the API call
        onUpdate(shortcut.id, { favicon: chromeFavicon });
      }
    });
    return () => { cancelled = true; };
  }, [shortcut.favicon, shortcut.url, onUpdate]);

  const handleFaviconError = () => {
    if (!faviconTriedIco) {
      setFaviconSrc(getFaviconIcoUrl(shortcut.url));
      setFaviconTriedIco(true);
    } else {
      setFaviconSrc('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (editMode) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSaveEdit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancelEdit();
      }
      return;
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setIsNavigating(true);
      onMoveLeft?.(index);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setIsNavigating(true);
      onMoveRight?.(index);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIsNavigating(true);
      onMoveUp?.(index);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsNavigating(true);
      onMoveDown?.(index);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigateToShortcut();
    } else if (e.key === 'Escape') {
      setIsNavigating(false);
      setKeyboardFocus(false);
    }
  };

  useEffect(() => {
    if (!showContextMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setShowContextMenu(false);
        setShowMoveSubmenu(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowContextMenu(false);
        setShowMoveSubmenu(false);
        if (editMode) setEditMode(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showContextMenu, editMode]);

  const navigateToShortcut = () => {
    if (editMode || showContextMenu || isGlobalEditing) return;
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.update(tabs[0].id, { url: shortcut.url });
      }
    });
  };

  const LONG_PRESS_MS = 500;

  const clearLongPress = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  useEffect(() => () => clearLongPress(), []);

  // Reset long press flag when exiting global edit mode
  useEffect(() => {
    if (!isGlobalEditing) {
      longPressTriggeredRef.current = false;
    }
  }, [isGlobalEditing]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (editMode || isGlobalEditing) return;
    if (e.button !== 0) return;
    longPressMovedRef.current = false;
    longPressTriggeredRef.current = false;
    clearLongPress();
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      onEnterEditMode?.();
    }, LONG_PRESS_MS);
  };

  const handlePointerMove = () => {
    if (longPressTimerRef.current !== null) {
      longPressMovedRef.current = true;
      clearLongPress();
    }
  };

  const handlePointerUp = () => {
    clearLongPress();
  };

  const handlePointerCancel = () => {
    clearLongPress();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(shortcut.id);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  // Measure actual menu dimensions and adjust position to avoid viewport overflow
  useLayoutEffect(() => {
    if (!showContextMenu || !contextMenuRef.current) return;
    const menu = contextMenuRef.current;
    const menuWidth = menu.offsetWidth;
    const menuHeight = menu.offsetHeight;
    const EDGE_BUFFER = 8;
    setContextMenuPos((prev) => {
      let x = prev.x;
      let y = prev.y;
      if (x + menuWidth + EDGE_BUFFER > window.innerWidth) {
        x = window.innerWidth - menuWidth - EDGE_BUFFER;
      }
      if (x < EDGE_BUFFER) x = EDGE_BUFFER;
      if (y + menuHeight + EDGE_BUFFER > window.innerHeight) {
        y = window.innerHeight - menuHeight - EDGE_BUFFER;
      }
      if (y < EDGE_BUFFER) y = EDGE_BUFFER;
      return { x, y };
    });
  }, [showContextMenu]);

  // When editUrl changes in edit mode, auto-update the favicon
  useEffect(() => {
    if (!editMode) return;
    if (editUrl && isUrl(editUrl.trim())) {
      setEditFaviconSrc(getSmartFaviconUrl(editUrl.trim()));
      setEditFaviconTriedIco(false);
    }
  }, [editUrl, editMode]);

  const handleEditFaviconError = () => {
    if (!editFaviconTriedIco) {
      setEditFaviconSrc(getFaviconIcoUrl(editUrl.trim() || shortcut.url));
      setEditFaviconTriedIco(true);
    } else {
      setEditFaviconSrc('');
    }
  };

  useEffect(() => {
    if (!editMode || !focusGroupFieldOnEdit) return;
    groupInputRef.current?.focus();
    groupInputRef.current?.select();
    setFocusGroupFieldOnEdit(false);
  }, [editMode, focusGroupFieldOnEdit]);

  const openEditMode = (focusGroup = false) => {
    setShowContextMenu(false);
    setShowMoveSubmenu(false);
    setEditTitle(shortcut.title);
    setEditUrl(shortcut.url);
    setEditGroup(shortcut.group || '');
    setEditFaviconSrc(shortcut.favicon || getSmartFaviconUrl(shortcut.url));
    setEditFaviconTriedIco(false);
    setEditError(false);
    setFocusGroupFieldOnEdit(focusGroup);
    setEditMode(true);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    openEditMode(false);
  };

  const handleSaveEdit = () => {
    if (editTitle.trim() && editUrl.trim()) {
      onUpdate(shortcut.id, { title: editTitle.trim(), url: editUrl.trim(), favicon: editFaviconSrc, group: editGroup.trim() || undefined });
      setEditMode(false);
    } else {
      setEditError(true);
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
  };

  const handleCopyUrl = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(shortcut.url);
    setShowContextMenu(false);
  };

  const handleCopyTitle = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(shortcut.title);
    setShowContextMenu(false);
  };

  if (editMode) {
    return (
      <div className={styles.editMode}>
        <div className={styles.editIconRow}>
          {editFaviconSrc ? (
            <img src={editFaviconSrc} alt="" onError={handleEditFaviconError} className={styles.editFavicon} />
          ) : (
            <svg className={styles.editFaviconGlobe} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
          )}
        </div>
        <input
          className={`${styles.editInput} ${editError && !editTitle.trim() ? styles.editInputError : ''}`}
          value={editTitle}
          onChange={(e) => { setEditTitle(e.target.value); setEditError(false); }}
          placeholder={t('shortcutTitlePlaceholder')}
          autoFocus
        />
        <input
          className={`${styles.editInput} ${editError && !editUrl.trim() ? styles.editInputError : ''}`}
          value={editUrl}
          onChange={(e) => { setEditUrl(e.target.value); setEditError(false); }}
          placeholder={t('shortcutUrlPlaceholder')}
        />
        <input
          className={`${styles.editInput} ${styles.editGroupInput}`}
          ref={groupInputRef}
          value={editGroup}
          onChange={(e) => setEditGroup(e.target.value)}
          placeholder={t('groupOptionalPlaceholder')}
          list={existingGroups && existingGroups.length > 0 ? "edit-shortcut-group-suggestions" : undefined}
        />
        {existingGroups && existingGroups.length > 0 && (
          <datalist id="edit-shortcut-group-suggestions">
            {existingGroups.filter(g => g !== shortcut.group).map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>
        )}
        <div className={styles.editActions}>
          <button className={styles.saveBtn} onClick={handleSaveEdit}>{t('save')}</button>
          <button className={styles.cancelBtn} onClick={handleCancelEdit}>{t('cancel')}</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={`${styles.container} ${keyboardFocus ? styles.keyboardFocus : ''} ${isNavigating ? styles.navigating : ''} ${isGroupPreviewTarget ? styles.groupPreviewTarget : ''} ${isGlobalEditing ? styles.globalEditing : ''}`}
        ref={containerRef}
        onContextMenu={handleContextMenu}
        title={isGlobalEditing ? t('editModeHint') : t('dragClickEnter')}
        onClick={navigateToShortcut}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        data-drag-handle={isGlobalEditing ? 'true' : undefined}
        style={isGlobalEditing ? { '--wobble-delay': `${(index * 73) % 200}ms` } as React.CSSProperties : undefined}
        tabIndex={0}
        onFocus={() => setKeyboardFocus(true)}
        onBlur={() => {
          setIsNavigating(false);
          setKeyboardFocus(false);
        }}
      >
        <div className={styles.iconWrapper} data-drag-handle="true" title={t('dragClickEnter')}>
          {faviconSrc ? (
            <img
              src={faviconSrc}
              alt=""
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
              onError={handleFaviconError}
              title={shortcut.url}
            />
          ) : (
            <GlobeIcon />
          )}
        </div>
        {isGroupPreviewTarget && <div className={styles.groupPreviewBadge}>{t('dropToGroup')}</div>}
        {shortcut.group && <div className={styles.groupLabel}>{shortcut.group.toUpperCase()}</div>}
        <div className={styles.title}>{shortcut.title}</div>
        {!shortcut.group && <div className={styles.domain}>{getDomainFromUrl(shortcut.url)}</div>}
        <button
          type="button"
          className={styles.deleteBtn}
          data-no-drag="true"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={handleDelete}
          aria-label={t('deleteShortcut')}
        >
          ×
        </button>
        {isNavigating && (
          <div className={styles.keyboardHint}>
            {isMac() ? '⌘← ⌘→ ↑↓ to move · Esc to exit' : '← → ↑↓ to move · Esc to exit'}
          </div>
        )}
      </div>

      {showContextMenu && createPortal(
        <div
          ref={contextMenuRef}
          className={styles.contextMenu}
          style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
        >
          {(() => {
            const availableGroups = (existingGroups || []).filter(g => g !== shortcut.group);
            const hasOtherGroups = availableGroups.length > 0;
            return (
              <>
                <button
                  className={styles.contextMenuItem}
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditMode(true);
                  }}
                >
                  🗂️ {shortcut.group ? t('editGroup') : t('addToGroup')}
                </button>
                <div
                  className={styles.contextMenuItemWrapper}
                  onMouseEnter={() => setShowMoveSubmenu(true)}
                  onMouseLeave={() => setShowMoveSubmenu(false)}
                >
                  <button
                    className={styles.contextMenuItem}
                    onClick={(e) => { e.stopPropagation(); setShowMoveSubmenu(!showMoveSubmenu); }}
                  >
                    <span>📁 {t('moveTo')}</span>
                    <span className={styles.submenuArrow}>▾</span>
                  </button>
                  {showMoveSubmenu && (
                    <div className={styles.submenu}>
                      {shortcut.group && (
                        <button
                          className={styles.contextMenuItem}
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdate(shortcut.id, { group: undefined });
                            setShowContextMenu(false);
                            setShowMoveSubmenu(false);
                          }}
                        >
                          ✂️ {t('ungroup')}
                        </button>
                      )}
                      {hasOtherGroups ? (
                        availableGroups.map((g) => (
                          <button
                            key={g}
                            className={styles.contextMenuItem}
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdate(shortcut.id, { group: g });
                              setShowContextMenu(false);
                              setShowMoveSubmenu(false);
                            }}
                          >
                            {g}
                          </button>
                        ))
                      ) : (
                        <button className={`${styles.contextMenuItem} ${styles.contextMenuItemDisabled}`} disabled>
                          {t('noOtherGroups')}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </>
            );
          })()}
          <button className={styles.contextMenuItem} onClick={(e) => handleEdit(e)}>
            ✏️ {t('edit')}
          </button>
          <button className={styles.contextMenuItem} onClick={(e) => { e.stopPropagation(); onDelete(shortcut.id); setShowContextMenu(false); }}>
            🗑️ {t('delete')}
          </button>
          <button className={styles.contextMenuItem} onClick={handleCopyUrl}>
            🔗 {t('copyUrl')}
          </button>
          <button className={styles.contextMenuItem} onClick={handleCopyTitle}>
            📋 {t('copyTitle')}
          </button>
        </div>,
        document.body
      )}
    </>
  );
}
