import { useState, useEffect, useRef } from 'react';
import styles from '../styles/components/Clock.module.css';
import { useSettings } from '../hooks/useSettings';

function formatClock(is24h: boolean) {
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
  const time = is24h ? `${hhStr}:${mm}:${ss}` : `${hhStr}:${mm}:${ss}${ampm}`;
  const yyyy = now.getFullYear();
  const mo = (now.getMonth() + 1).toString().padStart(2, '0');
  const dd = now.getDate().toString().padStart(2, '0');
  const date = `${yyyy}-${mo}-${dd}`;
  const weekday = now.toLocaleDateString(undefined, { weekday: 'long' });
  const dateLine = `${date} · ${weekday}`;
  return { time, dateLine };
}

export default function Clock() {
  const [time, setTime] = useState('');
  const [dateLine, setDateLine] = useState('');
  const { settings, updateClockFormat } = useSettings();
  const is24hRef = useRef(settings.clockIs24h !== false);

  useEffect(() => {
    is24hRef.current = settings.clockIs24h !== false;
  }, [settings.clockIs24h]);

  const toggleFormat = async () => {
    const newIs24h = !is24hRef.current;
    await updateClockFormat(newIs24h);
    is24hRef.current = newIs24h;
    const { time: newTime, dateLine: newDateLine } = formatClock(newIs24h);
    setTime(newTime);
    setDateLine(newDateLine);
  };

  useEffect(() => {
    const update = () => {
      const { time: newTime, dateLine: newDateLine } = formatClock(is24hRef.current);
      setTime(newTime);
      setDateLine(newDateLine);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.panel}>
      <div
        className={styles.container}
        onClick={toggleFormat}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') toggleFormat();
        }}
        aria-label={`时钟，${settings.clockIs24h !== false ? '24' : '12'} 小时制，点击切换`}
      >
        <div className={styles.time}>{time}</div>
        <div className={styles.dateLine}>{dateLine}</div>
      </div>
    </div>
  );
}
