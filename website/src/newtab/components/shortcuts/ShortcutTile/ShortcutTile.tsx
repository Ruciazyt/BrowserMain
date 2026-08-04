import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { getDomainFromUrl, getChromeFaviconUrl, getSmartFaviconUrl, getFaviconIcoUrl } from '../../../utils/storage';
import { isMac } from '../../../utils/platform';
import { isUrl } from '../../../utils/engines';
import { Shortcut } from '../../../utils/storage';
import { useI18n } from '../../../i18n';
import { ShortcutIcon } from '../ShortcutIcon';
import GroupDropdown from '../_shared/GroupDropdown';
import styles from './ShortcutTile.module.css';

interface ShortcutTileProps {
  shortcut: Shortcut;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Shortcut>) => void;
  index: number;
  onMoveLeft?: (index: number) => void;
  onMoveRight?: (index: number) => void;
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
  existingGroups?: string[];
  isGroupPreviewTarget?: boolean;
  isGlobalEditing?: boolean;
  /**
   * Rendered inside a DragOverlay (the floating preview). Suppresses the
   * click navigation handler and the wobble animation.
   */
  isOverlay?: boolean;
  /**
   * Set by the parent while a drag is in progress for this tile. While
   * `true`, mouse-up that would have been a click is suppressed.
   */
  isDragging?: boolean;
  onEnterEditMode?: () => void;
}

const MAX_GROUP_NAME_LENGTH = 30;

export default function ShortcutTile({
  shortcut,
  onDelete,
  onUpdate,
  index,
  onMoveLeft,
  onMoveRight,
  onMoveUp,
  onMoveDown,
  existingGroups,
  isGroupPreviewTarget,
  isGlobalEditing,
  isOverlay,
  isDragging,
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
  const [editModePosition, setEditModePosition] = useState({ top: 0, left: 0 });
  const [editModeGlassStyle, setEditModeGlassStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const editModeRef = useRef<HTMLDivElement>(null);
  const groupInputRef = useRef<HTMLInputElement>(null);
  // GroupDropdown's popover is portaled to <body>, so it sits outside
  // editModeRef's subtree. Track the popover node here so the document
  // click-outside handler below can treat clicks on it as "inside" —
  // otherwise picking a group option would close the edit panel before
  // the option's click handler runs.
  const groupPopoverRef = useRef<HTMLDivElement | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  // Set to true while the parent reports a drag is in progress. The click
  // handler consults it; a click that fires immediately after a drag is
  // suppressed so the user doesn't accidentally navigate.
  const justDraggedRef = useRef(false);
  useEffect(() => {
    if (!isDragging) return;
    justDraggedRef.current = true;
    const t = window.setTimeout(() => {
      justDraggedRef.current = false;
    }, 50);
    return () => window.clearTimeout(t);
  }, [isDragging]);

  // Try Chrome's native favicons API when no stored favicon exists. We
  // don't render the result directly — we persist it via onUpdate so
  // the next render's <ShortcutIcon> uses it. Until then, <ShortcutIcon>
  // falls through its own chain (favicon.ico → S2 → avatar) so the tile
  // is never blank.
  useEffect(() => {
    if (shortcut.favicon) return;
    let cancelled = false;
    getChromeFaviconUrl(shortcut.url).then((chromeFavicon) => {
      if (!cancelled && chromeFavicon) {
        onUpdate(shortcut.id, { favicon: chromeFavicon });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [shortcut.favicon, shortcut.url, shortcut.id, onUpdate]);


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
      triggerNavigation();
    } else if (e.key === 'Escape') {
      setIsNavigating(false);
      setKeyboardFocus(false);
    }
  };

  useEffect(() => {
    if (!showContextMenu && !editMode) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (contextMenuRef.current && contextMenuRef.current.contains(target)) return;
      if (editModeRef.current && editModeRef.current.contains(target)) return;
      // The GroupDropdown's popover is portaled to <body>, so it sits
      // outside `editModeRef`'s subtree. A click on the popover chrome
      // or an option must NOT close the edit panel.
      if (groupPopoverRef.current && groupPopoverRef.current.contains(target)) return;
      setShowContextMenu(false);
      setShowMoveSubmenu(false);
      setEditMode(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowContextMenu(false);
        setShowMoveSubmenu(false);
        setEditMode(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showContextMenu, editMode]);

  const isGlobalEditingRef = useRef(isGlobalEditing);
  const editModeActiveRef = useRef(editMode);
  useEffect(() => {
    isGlobalEditingRef.current = isGlobalEditing;
  }, [isGlobalEditing]);
  useEffect(() => {
    editModeActiveRef.current = editMode;
  }, [editMode]);

  const triggerNavigation = () => {
    if (justDraggedRef.current) return;
    if (isGlobalEditingRef.current || editModeActiveRef.current) return;
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

  useEffect(() => {
    if (!isGlobalEditing) {
      longPressTriggeredRef.current = false;
    }
  }, [isGlobalEditing]);

  // Long-press → enter global edit mode. Pointer events are owned by
  // dnd-kit's PointerSensor (attached to the wrapper), so this handler
  // is purely for the "still pointer" case.
  const handlePointerDown = (e: React.PointerEvent) => {
    if (editModeActiveRef.current || isGlobalEditingRef.current) return;
    if (e.button !== 0) return;
    longPressTriggeredRef.current = false;
    clearLongPress();
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      onEnterEditMode?.();
    }, LONG_PRESS_MS);
  };

  const handlePointerMove = () => {
    if (longPressTimerRef.current !== null) {
      clearLongPress();
    }
  };

  const handlePointerUp = () => {
    clearLongPress();
  };

  const handleClick = (e: React.MouseEvent) => {
    // The browser synthesizes a click after a quick mouseup even if dnd-kit
    // aborted the drag. The justDraggedRef guard catches that.
    if (justDraggedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (isGlobalEditingRef.current || editModeActiveRef.current) return;
    if (longPressTriggeredRef.current) return;
    if (showContextMenu) return;
    triggerNavigation();
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

  useLayoutEffect(() => {
    if (!editMode || !editModeRef.current) return;
    const panel = editModeRef.current;
    const anchor = containerRef.current?.getBoundingClientRect();
    if (!anchor) return;
    const panelRect = panel.getBoundingClientRect();
    const EDGE_BUFFER = 10;
    const halfWidth = panelRect.width / 2;
    const nextLeft = Math.min(
      window.innerWidth - halfWidth - EDGE_BUFFER,
      Math.max(halfWidth + EDGE_BUFFER, anchor.left + anchor.width / 2),
    );
    const below = anchor.bottom + 8;
    const above = anchor.top - panelRect.height - 8;
    const nextTop = below + panelRect.height + EDGE_BUFFER <= window.innerHeight
      ? below
      : Math.max(EDGE_BUFFER, above);

    if (nextTop !== editModePosition.top || nextLeft !== editModePosition.left) {
      setEditModePosition({ top: nextTop, left: nextLeft });
    }
  }, [editMode, editModePosition]);

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
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(containerRef.current);
      setEditModePosition({ top: rect.top + rect.height + 8, left: rect.left + rect.width / 2 });
      setEditModeGlassStyle({
        '--glass-card-opacity': computedStyle.getPropertyValue('--glass-card-opacity') || 1,
        '--glass-card-blur': computedStyle.getPropertyValue('--glass-card-blur') || '3px',
        '--glass-card-saturation': computedStyle.getPropertyValue('--glass-card-saturation') || '140%',
        '--glass-card-shadow-intensity': computedStyle.getPropertyValue('--glass-card-shadow-intensity') || 1,
        '--glass-card-tint-color': computedStyle.getPropertyValue('--glass-card-tint-color') || '#ffffff',
      } as React.CSSProperties);
    }
    setEditMode(true);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    openEditMode(false);
  };

  const handleSaveEdit = () => {
    if (editTitle.trim() && editUrl.trim()) {
      onUpdate(shortcut.id, {
        title: editTitle.trim(),
        url: editUrl.trim(),
        favicon: editFaviconSrc,
        group: editGroup.trim() || undefined,
      });
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

  const editModePortal = editMode ? createPortal(
      <div
        ref={editModeRef}
        className={`glass-card ${styles.editMode}`}
        style={{ ...editModeGlassStyle, top: editModePosition.top, left: editModePosition.left }}
        role="dialog"
        aria-label={shortcut.group ? t('editGroup') : t('addToGroup')}
      >
        <div className={styles.editIconRow}>
          {editFaviconSrc ? (
            <img src={editFaviconSrc} alt="" onError={handleEditFaviconError} className={styles.editFavicon} />
          ) : (
            <svg className={styles.editFaviconGlobe} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          )}
        </div>
        <input
          className={`${styles.editInput} ${editError && !editTitle.trim() ? styles.editInputError : ''}`}
          value={editTitle}
          onChange={(e) => {
            setEditTitle(e.target.value);
            setEditError(false);
          }}
          placeholder={t('shortcutTitlePlaceholder')}
          autoFocus
        />
        <input
          className={`${styles.editInput} ${editError && !editUrl.trim() ? styles.editInputError : ''}`}
          value={editUrl}
          onChange={(e) => {
            setEditUrl(e.target.value);
            setEditError(false);
          }}
          placeholder={t('shortcutUrlPlaceholder')}
        />
        <div className={styles.editGroupWrapper}>
          <GroupDropdown
            value={editGroup}
            onChange={setEditGroup}
            existingGroups={existingGroups ?? []}
            placeholder={t('groupOptionalPlaceholder')}
            maxLength={MAX_GROUP_NAME_LENGTH}
            variant="editPanel"
            inputRef={groupInputRef}
            onPopoverMount={(node) => { groupPopoverRef.current = node; }}
          />
        </div>
        <div className={styles.editActions}>
          <button className={styles.saveBtn} onClick={handleSaveEdit}>{t('save')}</button>
          <button className={styles.cancelBtn} onClick={handleCancelEdit}>{t('cancel')}</button>
        </div>
      </div>,
      document.body
    ) : null;

  return (
    <>
      <div
        className={`${styles.container} ${keyboardFocus ? styles.keyboardFocus : ''} ${isNavigating ? styles.navigating : ''} ${isGroupPreviewTarget ? styles.groupPreviewTarget : ''} ${isGlobalEditing ? styles.globalEditing : ''} ${isDragging ? styles.dragging : ''} ${isOverlay ? styles.overlay : ''}`}
        ref={containerRef}
        onContextMenu={handleContextMenu}
        title={isGlobalEditing ? t('editModeHint') : t('dragClickEnter')}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={isGlobalEditing ? ({ '--wobble-delay': `${(index * 73) % 200}ms` } as React.CSSProperties) : undefined}
        tabIndex={0}
        onFocus={() => setKeyboardFocus(true)}
        onBlur={() => {
          setIsNavigating(false);
          setKeyboardFocus(false);
        }}
      >
        <div className={styles.iconWrapper}>
          <ShortcutIcon
            url={shortcut.url}
            favicon={shortcut.favicon}
            title={shortcut.title}
            size="md"
            className={styles.iconImage}
          />
        </div>
        {isGroupPreviewTarget && <div className={styles.groupPreviewBadge}>{t('dropToGroup')}</div>}
        {shortcut.group && <div className={styles.groupLabel}>{shortcut.group.toUpperCase()}</div>}
        <div className={styles.title}>{shortcut.title}</div>
        {!shortcut.group && <div className={styles.domain}>{getDomainFromUrl(shortcut.url)}</div>}
        {!isOverlay && (
          <button
            type="button"
            className={styles.deleteBtn}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(shortcut.id);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            aria-label={t('deleteShortcut')}
          >
            ×
          </button>
        )}
        {isNavigating && (
          <div className={styles.keyboardHint}>
            {isMac() ? '⌘← ⌘→ ↑↓ to move · Esc to exit' : '← → ↑↓ to move · Esc to exit'}
          </div>
        )}
      </div>

      {editModePortal}

      {showContextMenu && createPortal(
        <div
          ref={contextMenuRef}
          className={`glass-card ${styles.contextMenu}`}
          style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
        >
          {(() => {
            const availableGroups = (existingGroups || []).filter((g) => g !== shortcut.group);
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
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMoveSubmenu(!showMoveSubmenu);
                    }}
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
          <button className={styles.contextMenuItem} onClick={(e) => {
            e.stopPropagation();
            onDelete(shortcut.id);
            setShowContextMenu(false);
          }}>
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
