import { Menu, Dropdown } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import styles from './TypeSelector.module.css';

const menu = (
  <Menu>
    <Menu.Item>
      <a
        target="_blank"
        rel="noopener noreferrer"
        href="https://www.antgroup.com">
        谷歌
      </a>
    </Menu.Item>
    <Menu.Item>
      <a
        target="_blank"
        rel="noopener noreferrer"
        href="https://www.aliyun.com">
        百度
      </a>
    </Menu.Item>
  </Menu>
);

const TypeSelector = () => (
  <Dropdown overlay={menu}>
    <a className="ant-dropdown-link" onClick={e => e.preventDefault()}>
      <img
        className={styles.logo}
        src="https://lf-cdn-tos.bytescm.com/obj/static/xitu_extension/static/baidu.9627e61f.png"
      />{' '}
      <DownOutlined />
    </a>
  </Dropdown>
);

export default TypeSelector;
