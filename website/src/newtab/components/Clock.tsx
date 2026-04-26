import { useState, useEffect, useRef } from 'react';
import styles from '../styles/components/Clock.module.css';
import { useSettings } from '../hooks/useSettings';
import { useI18n } from '../i18n';

const LUNAR_MONTHS = ['正月','二月','三月','四月','五月','六月','七月','八月','九月','十月','冬月','腊月'];
const LUNAR_DAYS = [
  '初一','初二','初三','初四','初五','初六','初七','初八','初九','初十',
  '十一','十二','十三','十四','十五','十六','十七','十八','十九','二十',
  '廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十',
];

function getLunarDate(_date: Date): string {
  const m = _date.getMonth();
  const d = _date.getDate();
  const idx = (m * 2 + d) % 30;
  const lunarMonth = LUNAR_MONTHS[(m + Math.floor(d / 30)) % 12];
  const lunarDay = LUNAR_DAYS[idx];
  return `农历${lunarMonth}${lunarDay}`;
}

function formatClock(is24h: boolean, locale: string, isZh: boolean) {
  const now = new Date();
  const hh = now.getHours();
  const mm = now.getMinutes().toString().padStart(2, '0');
  let ampm = '';
  let dispHh = hh;
  if (!is24h) {
    ampm = hh >= 12 ? ' PM' : ' AM';
    dispHh = hh % 12 || 12;
  }
  const hhStr = dispHh.toString().padStart(2, '0');
  const time = is24h ? `${hhStr}:${mm}` : `${hhStr}:${mm}${ampm}`;

  let dateLine: string;
  if (isZh) {
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const weekdays = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
    const weekday = weekdays[now.getDay()];
    const lunar = getLunarDate(now);
    dateLine = `${month}月${day}日 ${weekday} ${lunar}`;
  } else {
    const dateFmt = new Intl.DateTimeFormat(locale, { year: 'numeric', month: '2-digit', day: '2-digit' });
    const parts = dateFmt.formatToParts(now);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
    const date = `${get('year')}-${get('month')}-${get('day')}`;
    const weekday = new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(now);
    dateLine = `${date} · ${weekday}`;
  }

  return { time, dateLine };
}

export default function Clock() {
  const [time, setTime] = useState('');
  const [dateLine, setDateLine] = useState('');
  const { settings, updateClockFormat } = useSettings();
  const { locale, isZh, t } = useI18n();
  const is24hRef = useRef(settings.clockIs24h !== false);

  useEffect(() => {
    is24hRef.current = settings.clockIs24h !== false;
  }, [settings.clockIs24h]);

  const toggleFormat = async () => {
    const newIs24h = !is24hRef.current;
    await updateClockFormat(newIs24h);
    is24hRef.current = newIs24h;
    const { time: newTime, dateLine: newDateLine } = formatClock(newIs24h, locale, isZh);
    setTime(newTime);
    setDateLine(newDateLine);
  };

  useEffect(() => {
    const update = () => {
      const { time: newTime, dateLine: newDateLine } = formatClock(is24hRef.current, locale, isZh);
      setTime(newTime);
      setDateLine(newDateLine);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [locale, isZh]);

  return (
    <div
      className={styles.container}
      onClick={toggleFormat}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') toggleFormat();
      }}
      aria-label={t('clockAria', { format: settings.clockIs24h !== false ? '24' : '12' })}
    >
      <div className={styles.time}>{time}</div>
      <div className={styles.dateLine}>{dateLine}</div>
    </div>
  );
}
