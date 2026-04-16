import { Shortcut } from '../utils/storage';
import ShortcutTile from './ShortcutTile';
import styles from '../styles/components/ShortcutGrid.module.css';

interface ShortcutGridProps {
  shortcuts: Shortcut[];
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Shortcut>) => void;
}

export default function ShortcutGrid({ shortcuts, onDelete, onUpdate }: ShortcutGridProps) {
  if (shortcuts.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <div className={styles.emptyTitle}>No shortcuts yet</div>
          <div className={styles.emptyHint}>
            Use the toolbar button to add your first shortcut
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {shortcuts.map((shortcut) => (
        <ShortcutTile
          key={shortcut.id}
          shortcut={shortcut}
          onDelete={onDelete}
          onUpdate={onUpdate}
        />
      ))}
    </div>
  );
}