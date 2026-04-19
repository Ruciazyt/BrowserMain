import { useState, useEffect, useRef } from 'react';
import styles from '../styles/components/Clock.module.css';
import { useSettings } from '../hooks/useSettings';

function formatClock(is24h: boolean, locale: string) {
  const now = new Date();

  // Format time manually for full control over 12h/24h display
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

  // Format date parts explicitly to avoid i18n issues
  const dateFmt = new Intl.DateTimeFormat(locale, { year: 'numeric', month: '2-digit', day: '2-digit' });
  const parts = dateFmt.formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const date = `${get('year')}-${get('month')}-${get('day')}`;

  // Weekday in long format
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(now);
  const dateLine = `${date} · ${weekday}`;

  return { time, dateLine };
}

export default function Clock() {
  const [time, setTime] = useState('');
  const [dateLine, setDateLine] = useState('');
  const { settings, updateClockFormat } = useSettings();
  const is24hRef = useRef(settings.clockIs24h !== false);

  // Computed once at mount — stable locale for the session
  const localeRef = useRef<string>(Intl.DateTimeFormat().resolvedOptions().locale);

  useEffect(() => {
    is24hRef.current = settings.clockIs24h !== false;
  }, [settings.clockIs24h]);

  const toggleFormat = async () => {
    const newIs24h = !is24hRef.current;
    await updateClockFormat(newIs24h);
    is24hRef.current = newIs24h;
    const { time: newTime, dateLine: newDateLine } = formatClock(newIs24h, localeRef.current);
    setTime(newTime);
    setDateLine(newDateLine);
  };

  useEffect(() => {
    const update = () => {
      const { time: newTime, dateLine: newDateLine } = formatClock(is24hRef.current, localeRef.current);
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
