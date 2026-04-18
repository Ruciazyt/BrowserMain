import { useState, useEffect, useRef } from 'react';
import styles from '../styles/components/Clock.module.css';
import { useSettings } from '../hooks/useSettings';

const DECORATIVE_DOTS = [1, 0, 1, 0, 1, 0, 1, 0];

export default function Clock() {
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');
  const [day, setDay] = useState('');
  const { settings, updateClockFormat } = useSettings();
  // Ref so the interval callback always reads the latest 24h setting without deps
  const is24hRef = useRef(settings.clockIs24h !== false);

  // Keep ref in sync when settings change (e.g. from Settings panel)
  useEffect(() => {
    is24hRef.current = settings.clockIs24h !== false;
  }, [settings.clockIs24h]);

  // Toggle 24h/12h on click — updates the ref; the interval picks it up on next tick
  const toggleFormat = () => {
    const newIs24h = !is24hRef.current;
    updateClockFormat(newIs24h);
    is24hRef.current = newIs24h;
    // Trigger immediate re-render with the new format by calling update once
    const now = new Date();
    const hh = now.getHours();
    const mm = now.getMinutes().toString().padStart(2, '0');
    const ss = now.getSeconds().toString().padStart(2, '0');
    let ampm = '';
    let dispHh = hh;
    if (!newIs24h) {
      ampm = hh >= 12 ? ' PM' : ' AM';
      dispHh = hh % 12 || 12;
    }
    const hhStr = dispHh.toString().padStart(2, '0');
    setTime(`${hhStr}:${mm}:${ss}${ampm}`);
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
      const dd = now.getDate().toString().toString().padStart(2, '0');
      setDate(`${yyyy}-${mo}-${dd}`);
      setDay(now.toLocaleDateString(undefined, { weekday: 'long' }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []); // interval set up once; reads is24hRef directly each tick

  return (
    <div className={styles.panel}>
      <div className={styles.dotRow}>
        {DECORATIVE_DOTS.map((on, i) => (
          <div key={i} className={`${styles.dot} ${on ? '' : styles.dotOff}`} />
        ))}
      </div>
      <div
        className={styles.container}
        onClick={toggleFormat}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleFormat(); }}
        aria-label={`Clock, currently ${settings.clockIs24h !== false ? '24-hour' : '12-hour'} format. Click to toggle.`}
      >
        <div className={styles.time}>{time}</div>
        <div className={styles.date}>{date}</div>
        <div className={styles.day}>{day}</div>
      </div>
    </div>
  );
}
