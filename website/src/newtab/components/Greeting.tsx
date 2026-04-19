import { useState, useEffect, useRef } from 'react';
import styles from '../styles/components/Greeting.module.css';

function getGreeting(hour: number, isZh: boolean): string {
  if (hour >= 0 && hour < 5) return isZh ? '凌晨' : 'GOOD NIGHT';
  if (hour >= 5 && hour < 9) return isZh ? '早上好' : 'GOOD MORNING';
  if (hour >= 9 && hour < 12) return isZh ? '上午好' : 'GOOD MORNING';
  if (hour >= 12 && hour < 14) return isZh ? '中午好' : 'GOOD AFTERNOON';
  if (hour >= 14 && hour < 18) return isZh ? '下午好' : 'GOOD AFTERNOON';
  if (hour >= 18 && hour < 23) return isZh ? '晚上好' : 'GOOD EVENING';
  return isZh ? '午夜好' : 'GOOD NIGHT';
}

function getSubtitle(isZh: boolean): string {
  return isZh ? '愿今日如云端般宁静。' : 'May your day be calm as clouds.';
}

function detectIsZh(lang: string): boolean {
  return lang.startsWith('zh');
}

export default function Greeting({ userName }: { userName?: string }) {
  // Reactive IS_ZH — updates when browser UI language changes
  const [isZh, setIsZh] = useState<boolean>(() => detectIsZh(navigator.language));
  const [greeting, setGreeting] = useState('');
  const lastHourRef = useRef<number>(-1);
  const [, onHourChange] = useState(0);

  // Keep IS_ZH in sync when navigator.language changes
  useEffect(() => {
    const handler = () => setIsZh(detectIsZh(navigator.language));
    window.addEventListener('languagechange', handler);
    return () => window.removeEventListener('languagechange', handler);
  }, []);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const currentHour = now.getHours();
      setGreeting(getGreeting(currentHour, isZh));
      if (currentHour !== lastHourRef.current) {
        lastHourRef.current = currentHour;
        onHourChange((n) => n + 1);
      }
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [isZh]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.block}>
        <div className={styles.greeting}>{userName ? `${greeting}, ${userName}` : greeting}</div>
        <div className={styles.subtitle}>{getSubtitle(isZh)}</div>
      </div>
    </div>
  );
}
