import { useState, useEffect, useRef } from 'react';
import styles from '../styles/components/Clock.module.css';

const DECORATIVE_DOTS = [1, 0, 1, 0, 1, 0, 1, 0];

export default function Clock() {
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');
  const [day, setDay] = useState('');
  const [is24h, setIs24h] = useState(true);
  const is24hRef = useRef(is24h);

  // Keep ref in sync with state
  useEffect(() => {
    is24hRef.current = is24h;
  }, [is24h]);

  // Load 12/24h preference on mount
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
      if (!is24hRef.current) {
        ampm = hh >= 12 ? ' PM' : ' AM';
        hh = hh % 12 || 12;
      }
      const hhStr = hh.toString().padStart(2, '0');
      setTime(`${hhStr}:${mm}:${ss}${ampm}`);
      const yyyy = now.getFullYear();
      const mo = (now.getMonth() + 1).toString().padStart(2, '0');
      const dd = now.getDate().toString().padStart(2, '0');
      setDate(`${yyyy}-${mo}-${dd}`);
      setDay(now.toLocaleDateString(undefined, { weekday: 'long' }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.panel}>
      <div className={styles.dotRow}>
        {DECORATIVE_DOTS.map((on, i) => (
          <div key={i} className={`${styles.dot} ${on ? '' : styles.dotOff}`} />
        ))}
      </div>
      <div className={styles.container} onClick={toggleFormat} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleFormat(); }} aria-label={`Clock, currently ${is24h ? '24-hour' : '12-hour'} format. Click to toggle.`}>
        <div className={styles.time}>{time}</div>
        <div className={styles.date}>{date}</div>
        <div className={styles.day}>{day}</div>
      </div>
    </div>
  );
}
