import { useI18n, type MessageKey } from '../../../i18n';
import Glass from '../../ui/Glass/Glass';
import styles from './Sidebar.module.css';

interface SidebarProps {
  activeNav: string;
  collapsed: boolean;
  onActiveNavChange: (nav: string) => void;
  onOpenSettings: () => void;
  onToggleCollapse: () => void;
}

const NAV_ITEMS: { id: string; labelKey: MessageKey; icon: string }[] = [
  { id: 'home', labelKey: 'nav_home', icon: '⌂' },
  { id: 'rss', labelKey: 'nav_rss', icon: '◉' },
];

export default function Sidebar({
  activeNav,
  collapsed,
  onActiveNavChange,
  onOpenSettings,
  onToggleCollapse,
}: SidebarProps) {
  const { t } = useI18n();

  return (
    <Glass
      as="aside"
      className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ''}`}
    >
      <div className={styles.sidebarLogo}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="4" />
          <path d="M8 12h8M12 8v8" />
        </svg>
        {!collapsed && <span>BrowserMain</span>}
      </div>

      <nav className={styles.sidebarNav}>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`${styles.sidebarItem} ${activeNav === item.id ? styles.active : ''}`}
            onClick={() => onActiveNavChange(item.id)}
            title={t(item.labelKey)}
          >
            <span className={styles.sidebarItemIcon} aria-hidden="true">{item.icon}</span>
            {!collapsed && <span>{t(item.labelKey)}</span>}
          </button>
        ))}
      </nav>

      <div className={styles.sidebarBottom}>
        <button
          type="button"
          className={styles.sidebarIconBtn}
          onClick={onOpenSettings}
          title={t('settings')}
          aria-label={t('settings')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        </button>
        <button
          type="button"
          className={styles.sidebarIconBtn}
          onClick={onToggleCollapse}
          title={collapsed ? t('expandSidebar') : t('collapseSidebar')}
          aria-label={collapsed ? t('expandSidebar') : t('collapseSidebar')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {collapsed ? (
              <polyline points="9 18 15 12 9 6" />
            ) : (
              <polyline points="15 18 9 12 15 6" />
            )}
          </svg>
        </button>
      </div>
    </Glass>
  );
}
