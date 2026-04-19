import { useState, useEffect, useRef } from 'react';
import styles from '../styles/components/Clock.module.css';
import { useSettings } from '../hooks/useSettings';

const DECORATIVE_DOTS = [1, 0, 1, 0, 1, 0, 1, 0];

function formatTime(is24h: boolean) {
  const now = new Date();
  const hh = now.getHours();
  const mm = now.getMinutes().toString().padStart(2, '0');
  const ss = now.getSeconds().toString().padStart(2, '0');
  let ampm = '';
  let dispHh = hh;
  if (!is24h) {
    ampm = hh >= 12 ? ' PM' : ' AM';
    dispHh = hh % 12 || 12;
  }
  const hhStr = dispHh.toString().padStart(2, '0');
  const time = is24h ? `${hhStr}:${mm}:${ss}` : `${hhStr}:${mm}${ampm}`;
  const yyyy = now.getFullYear();
  const mo = (now.getMonth() + 1).toString().padStart(2, '0');
  const dd = now.getDate().toString().padStart(2, '0');
  const date = `${yyyy}-${mo}-${dd}`;
  const day = now.toLocaleDateString(undefined, { weekday: 'long' });
  return { time, date, day };
}

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
  const toggleFormat = async () => {
    const newIs24h = !is24hRef.current;
    await updateClockFormat(newIs24h);
    is24hRef.current = newIs24h;
    const { time: newTime, date: newDate, day: newDay } = formatTime(newIs24h);
    setTime(newTime);
    setDate(newDate);
    setDay(newDay);
  };

  useEffect(() => {
    const update = () => {
      const { time: newTime, date: newDate, day: newDay } = formatTime(is24hRef.current);
      setTime(newTime);
      setDate(newDate);
      setDay(newDay);
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
        aria-label={`Clock format: ${settings.clockIs24h !== false ? '24-hour' : '12-hour'}. Click to toggle.`}
      >
        <div className={styles.time}>{time}</div>
        <div className={styles.date}>{date}</div>
        <div className={styles.day} aria-label={`Today is ${day}`}>
          {day.split('').map((char, i) => (
            char === ' '
              ? <span key={i} className={styles.daySpace}> </span>
              : <span key={i} className={styles.dayChar} style={{ '--char-index': i } as React.CSSProperties}>{char}</span>
          ))}
        </div>
        <div
          className={styles.formatBadge}
          onClick={toggleFormat}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleFormat(); }}
          aria-label={`Clock format: ${settings.clockIs24h !== false ? '24-hour' : '12-hour'}. Click to toggle.`}
        >
          {settings.clockIs24h !== false ? '24H' : '12H'}
        </div>
      </div>
    </div>
  );
}
