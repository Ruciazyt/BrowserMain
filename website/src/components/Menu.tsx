import { MenuOutlined } from '@ant-design/icons';
import { useState } from 'react';
import styles from './Menu.module.css';

const Menu = () => {
  const [ActiveClass, setActiveClass] = useState('');
  const showMenu = () => {
    if (ActiveClass === styles.nav_visible) {
      setActiveClass('');
    } else {
      setActiveClass(styles.nav_visible);
    }
  };
  return (
    <div className={`${styles.menu} ${ActiveClass}`}>
      <a className={styles.menuTrigger} onClick={showMenu}>
        <MenuOutlined />
      </a>
      <ul>
        <li>
          <a>设置</a>
        </li>
        <li>
          <a>更换壁纸</a>
        </li>
        <li>
          <a>更多</a>
        </li>
      </ul>
      <span aria-hidden="true" className={styles.menu_bg}></span>
    </div>
  );
};

export default Menu;
