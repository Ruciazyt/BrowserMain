import { useState, useEffect, useRef } from 'react';
import styles from '../styles/components/Greeting.module.css';

function getGreeting(hour: number): string {
  const isZh = typeof navigator !== 'undefined' && navigator.language.startsWith('zh');
  if (hour >= 0 && hour < 5) return isZh ? '凌晨' : 'GOOD NIGHT';
  if (hour >= 5 && hour < 9) return isZh ? '早上好' : 'GOOD MORNING';
  if (hour >= 9 && hour < 12) return isZh ? '上午好' : 'GOOD MORNING';
  if (hour >= 12 && hour < 14) return isZh ? '中午好' : 'GOOD AFTERNOON';
  if (hour >= 14 && hour < 18) return isZh ? '下午好' : 'GOOD AFTERNOON';
  if (hour >= 18 && hour < 23) return isZh ? '晚上好' : 'GOOD EVENING';
  return isZh ? '夜深了' : 'GOOD NIGHT';
}

export default function Greeting() {
  const [greeting, setGreeting] = useState('');
  const [, forceUpdate] = useState(0);
  const lastDayRef = useRef<number>(-1);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const currentDay = now.getDate();
      if (currentDay !== lastDayRef.current) {
        lastDayRef.current = currentDay;
        forceUpdate(n => n + 1);
      }
      setGreeting(getGreeting(now.getHours()));
    };
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.greeting}>
      {greeting}
    </div>
  );
}
