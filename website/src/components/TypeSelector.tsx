import { useEffect, useState } from 'react';
import { Select } from 'antd';
import styles from './TypeSelector.module.css';
import '../global.less';

const { Option } = Select;

const typeList = [
  {
    name: '百度',
    value: 'Baidu',
    logoUrl:
      'https://lf-cdn-tos.bytescm.com/obj/static/xitu_extension/static/baidu.9627e61f.png',
    action: 'https://www.baidu.com/s',
    queryName: 'wd',
    queryId: 'kw',
  },
  {
    name: '谷歌',
    value: 'Google',
    logoUrl:
      'https://lf-cdn-tos.bytescm.com/obj/static/xitu_extension/static/google.323f7015.png',
    action: 'https://www.google.com/search',
    queryName: 'q',
    queryId: 'search',
  },
];

const TypeSelector = () => {
  const [submitAction, setSubmitAction] = useState({
    name: '',
    action: '',
    queryName: '',
    queryId: '',
  });
  const handleChange = (_: any, options: { detail: any }) => {
    const data = options.detail;
    setSubmitAction({
      name: data.value,
      action: data.action,
      queryName: data.queryName,
      queryId: data.queryId,
    });
    localStorage.setItem('searchData', JSON.stringify(data));
  };
  useEffect(() => {
    const localData = localStorage.getItem('searchData');
    const data = JSON.parse(localData) || typeList[0];
    setSubmitAction({
      name: data.value,
      action: data.action,
      queryName: data.queryName,
      queryId: data.queryId,
    });
  }, []);
  return (
    <div className={styles.searchBar}>
      <form
        action={submitAction.action}
        method="GET"
        target="_blank"
        className={styles.inputForm}>
        <div className={styles.queryTypeSelector}>
          <Select
            value={submitAction.name}
            className={styles.typeSelector}
            onChange={handleChange}
            size="large"
            dropdownMatchSelectWidth={100}
            optionLabelProp="name">
            {typeList.map(item => (
              <Option
                value={item.value}
                key={item.value}
                label={item.value}
                detail={item}
                name={<img src={item.logoUrl} className={styles.logo}></img>}>
                <div className="optionStyle">
                  <img className={styles.logo} src={item.logoUrl} />
                  <span>{item.name}</span>
                </div>
              </Option>
            ))}
          </Select>
        </div>
        <input
          type="text"
          name={submitAction.queryName}
          id={submitAction.queryId}
          className={styles.queryBar}
          autoFocus={true}
          autoComplete="off"></input>
        <input type="submit" style={{ display: 'none' }} value=" " />
      </form>
    </div>
  );
};

export default TypeSelector;
