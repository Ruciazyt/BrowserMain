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
          className={styles.sidebarItem}
          onClick={onOpenSettings}
          title={t('settings')}
        >
          <span className={styles.sidebarItemIcon} aria-hidden="true">⚙</span>
          {!collapsed && <span>{t('settings')}</span>}
        </button>
        <button
          type="button"
          className={styles.sidebarItem}
          onClick={onToggleCollapse}
          title={collapsed ? t('expandSidebar') : t('collapseSidebar')}
        >
          <span className={styles.sidebarItemIcon} aria-hidden="true">{collapsed ? '›' : '‹'}</span>
          {!collapsed && <span>{t('collapseSidebar')}</span>}
        </button>
      </div>
    </Glass>
  );
}
