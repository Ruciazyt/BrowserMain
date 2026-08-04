import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Glass from '../../ui/Glass/Glass';
import { useI18n } from '../../../i18n';
import styles from './GroupDropdown.module.css';

interface GroupDropdownProps {
  /** Current group name. `''` (or any empty string) means "no group". */
  value: string;
  /** Fired when the user picks an existing group, clears the group, or types
   *  into the text field. Receives the new value (`''` = no group). */
  onChange: (next: string) => void;
  /** Every existing group name in storage. Used to populate the popover list. */
  existingGroups: readonly string[];
  /** Placeholder text shown when the text field is empty. */
  placeholder?: string;
  /** Maximum allowed character count. Enforced via the `maxLength` attribute. */
  maxLength?: number;
  /** Visual treatment — controls the color tokens used by the input/popover. */
  variant: 'modal' | 'editPanel';
  /** Optional ref to the underlying text input. Lets callers focus/select
   *  the field after mount (e.g. when opening an editor with the group
   *  field already in scope). */
  inputRef?: React.RefObject<HTMLInputElement | null>;
  /** Callback fired with the popover container node whenever it mounts
   *  to `<body>` and clears it on unmount. Hosts that run their own
   *  document-level click-outside (e.g. ShortcutTile edit panel,
   *  AddShortcutDialog overlay) MUST add this node to their "inside"
   *  guard list — otherwise the popover's portal target sits outside the
   *  host's DOM tree and a click on any option would close the host
   *  before the option's click handler runs. */
  onPopoverMount?: (node: HTMLDivElement | null) => void;
}

interface PopoverLayout {
  top: number;
  left: number;
  minWidth: number;
}

/**
 * Group selector — an editable text field with an attached dropdown button.
 *
 * Why custom rather than `<input list="…">`?
 *   1. `<datalist>` only shows matching options as the user types, and never
 *      reliably opens via the chevron in Chromium — users had no way to
 *      see all existing groups without first typing a matching character.
 *   2. The previous edit-mode implementation filtered out the *current*
 *      group from the suggestions, so a user with only one group saw an
 *      empty dropdown with no way to switch to anything.
 *
 * This component:
 *   - Renders a text input that doubles as a search/filter field.
 *   - Renders a chevron button that opens a popover with the full group
 *     list (including the current group, so it can be re-selected).
 *   - Renders a "Clear" entry to un-group a shortcut.
 *   - Renders an empty-state hint when there are no existing groups.
 *
 * The popover is portaled to `document.body` to escape the host's stacking
 * context (the AddShortcutDialog modal and the ShortcutTile edit panel both
 * create compositing layers via `backdrop-filter` that would otherwise
 * paint the popover underneath themselves).
 */
export default function GroupDropdown({
  value,
  onChange,
  existingGroups,
  placeholder,
  maxLength,
  variant,
  inputRef,
  onPopoverMount,
}: GroupDropdownProps) {
  const { t } = useI18n();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const internalInputRef = useRef<HTMLInputElement>(null);
  // Resolve the input ref — caller-supplied ref wins, otherwise fall back
  // to our internal one so handleSelect still works without one.
  const resolvedInputRef = inputRef ?? internalInputRef;
  const popoverRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [layout, setLayout] = useState<PopoverLayout | null>(null);

  // Keep the popover glued to the trigger as the page scrolls or the window
  // resizes. We listen on scroll with `capture: true` because some scrollable
  // ancestors stop propagation before the bubble phase reaches the window.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setLayout(null);
      return;
    }
    const update = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      setLayout({
        top: rect.bottom + 6,
        left: rect.left,
        minWidth: Math.max(180, rect.width),
      });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open]);

  // Dismiss on any pointerdown that lands outside both the trigger button
  // and the popover itself. We use `mousedown` (not `click`) so the popover
  // disappears before the new click's default action runs.
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Both the host's edit-panel/dialog and our popover listen on
        // `document`. `stopPropagation` only stops further listeners on
        // *other* elements from firing; `stopImmediatePropagation` also
        // blocks other listeners on the *same* element (i.e. the host's
        // own document-level Escape handler) from running. The popover's
        // effect runs *before* the host's (child effects run before
        // parent effects), so we're guaranteed to be first.
        e.stopPropagation();
        e.stopImmediatePropagation();
        setOpen(false);
        // Hand focus back to the trigger so keyboard users land somewhere
        // sensible after dismissing the popover.
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const handleSelect = (next: string) => {
    onChange(next);
    setOpen(false);
    // Refocus the text field after a selection so the user can refine or
    // add another character without grabbing the mouse again.
    resolvedInputRef.current?.focus();
  };

  // The popover lists every existing group. The current group is included
  // (we previously hid it, which left the dropdown looking empty when the
  // user only had one group). A separate "clear" entry handles un-grouping.
  const popoverContent = open && layout && createPortal(
    <div
      ref={(node) => {
        // Bridge the popover DOM node to the parent via callback ref so
        // hosts can include it in their click-outside guard list. Without
        // this, clicking a group option would close the host (edit panel
        // / dialog) before the option's click handler runs.
        (popoverRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        onPopoverMount?.(node);
      }}
      className={styles.popoverWrapper}
      style={{
        position: 'fixed',
        top: layout.top,
        left: layout.left,
        minWidth: layout.minWidth,
        // z-index matched to SearchBar.tsx so we sit above every other
        // overlay in the app, including the right-click context menu.
        zIndex: 2147483646,
      }}
      role="listbox"
      aria-label={placeholder || 'Group'}
      onMouseDown={(e) => {
        // The host's document `mousedown` handler closes the surrounding
        // dialog/panel when it sees a target outside the host's DOM tree.
        // Our portal node is outside that tree, so without this stop the
        // host would close before our own `mousedown` handler runs and
        // marks the click as "inside". A click on the popover chrome
        // (padding, scrollbar, etc.) is therefore explicitly claimed.
        e.stopPropagation();
      }}
    >
      <Glass className={`${styles.popover} ${variant === 'modal' ? styles.modalVariant : styles.editPanelVariant}`}>
        {value !== '' && (
          <button
            type="button"
            className={`${styles.item} ${styles.clearItem}`}
            onClick={() => handleSelect('')}
            role="option"
            aria-selected="false"
            aria-label={t('ungroup')}
          >
            <span className={styles.itemIcon} aria-hidden="true">✖️</span>
            <span className={styles.itemLabel}>{t('ungroup')}</span>
          </button>
        )}
        {existingGroups.length === 0 ? (
          <div className={styles.emptyHint}>{t('noOtherGroups')}</div>
        ) : (
          existingGroups.map((g) => {
            const isCurrent = g === value;
            return (
              <button
                key={g}
                type="button"
                className={`${styles.item} ${isCurrent ? styles.itemCurrent : ''}`}
                onClick={() => handleSelect(g)}
                role="option"
                aria-selected={isCurrent}
                aria-label={g}
              >
                <span className={styles.itemIcon} aria-hidden="true">📁</span>
                <span className={styles.itemLabel}>{g}</span>
                {isCurrent && <span className={styles.itemCheck} aria-hidden="true">✓</span>}
              </button>
            );
          })
        )}
      </Glass>
    </div>,
    document.body,
  );

  // ── Visual variant token scoping ─────────────────────────────────
  // We can't reuse the host's CSS variables directly because the popover
  // is portaled to <body>. We hoist the variant's color tokens onto the
  // wrapper via inline custom properties so the popover picks them up.
  const variantStyle =
    variant === 'modal'
      ? ({
          '--gd-text-primary': 'var(--modal-text-primary, #1d1d1f)',
          '--gd-text-secondary': 'var(--modal-text-secondary, #6e6e73)',
          '--gd-border': 'var(--modal-border, rgba(0, 0, 0, 0.1))',
          '--gd-border-soft': 'var(--modal-border-soft, rgba(0, 0, 0, 0.06))',
          '--gd-surface': 'var(--surface-secondary, #f5f5f7)',
          '--gd-placeholder': 'var(--modal-placeholder, #a1a1a6)',
        } as React.CSSProperties)
      : ({
          '--gd-text-primary': 'var(--edit-text-primary, #1d1d1f)',
          '--gd-text-secondary': 'var(--edit-text-secondary, #6e6e73)',
          '--gd-border': 'rgba(0, 0, 0, 0.11)',
          '--gd-border-soft': 'rgba(0, 0, 0, 0.06)',
          '--gd-surface': 'rgba(255, 255, 255, 0.58)',
          '--gd-placeholder': 'rgba(0, 0, 0, 0.45)',
        } as React.CSSProperties);

  return (
    <div className={styles.root} style={variantStyle}>
      <div className={styles.inputRow}>
        <input
          ref={resolvedInputRef}
          type="text"
          className={styles.input}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          aria-label={placeholder || 'Group'}
          autoComplete="off"
        />
        <button
          ref={triggerRef}
          type="button"
          className={styles.trigger}
          onClick={() => setOpen((prev) => !prev)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={t('openGroupList')}
          tabIndex={-1}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            aria-hidden="true"
            className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
          >
            <path
              d="M2 3.5 L5 6.5 L8 3.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      {popoverContent}
    </div>
  );
}