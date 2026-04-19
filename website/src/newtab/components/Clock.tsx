import { useState, useEffect } from 'react';
import styles from '../styles/components/Clock.module.css';

export default function Clock() {
  const [time, setTime] = useState('');
  const [dateLine, setDateLine] = useState('');
  const [is24h, setIs24h] = useState(true);

  useEffect(() => {
    chrome.storage.local.get('clockIs24h', (result) => {
      if (chrome.runtime.lastError) return;
      if (typeof result.clockIs24h === 'boolean') {
        setIs24h(result.clockIs24h);
      }
    });
  }, []);

  const toggleFormat = () => {
    const next = !is24h;
    setIs24h(next);
    chrome.storage.local.set({ clockIs24h: next });
  };

  useEffect(() => {
    const update = () => {
      const now = new Date();
      let hh = now.getHours();
      const mm = now.getMinutes().toString().padStart(2, '0');
      const ss = now.getSeconds().toString().padStart(2, '0');
      let ampm = '';
      if (!is24h) {
        ampm = hh >= 12 ? ' PM' : ' AM';
        hh = hh % 12 || 12;
      }
      const hhStr = hh.toString().padStart(2, '0');
      setTime(`${hhStr}:${mm}:${ss}${ampm}`);
      const yyyy = now.getFullYear();
      const mo = (now.getMonth() + 1).toString().padStart(2, '0');
      const dd = now.getDate().toString().padStart(2, '0');
      const weekday = now.toLocaleDateString(undefined, { weekday: 'long' });
      setDateLine(`${yyyy}-${mo}-${dd} · ${weekday}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [is24h]);

  return (
    <div
      className={styles.heroClock}
      onClick={toggleFormat}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') toggleFormat();
      }}
      aria-label={`Clock, ${is24h ? '24-hour' : '12-hour'} format. Click to toggle.`}
    >
      <div className={styles.time}>{time}</div>
      <div className={styles.dateLine}>{dateLine}</div>
    </div>
  );
}
