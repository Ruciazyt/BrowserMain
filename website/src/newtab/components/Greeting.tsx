import { useState, useEffect } from 'react';
import styles from '../styles/components/Greeting.module.css';

function getGreeting(hour: number): string {
  const isZh = typeof navigator !== 'undefined' && navigator.language.startsWith('zh');
  if (hour >= 5 && hour < 9) return isZh ? '早上好' : 'Good morning';
  if (hour >= 9 && hour < 12) return isZh ? '上午好' : 'Good morning';
  if (hour >= 12 && hour < 14) return isZh ? '中午好' : 'Good afternoon';
  if (hour >= 14 && hour < 18) return isZh ? '下午好' : 'Good afternoon';
  if (hour >= 18 && hour < 23) return isZh ? '晚上好' : 'Good evening';
  return isZh ? '夜深了' : 'Good night';
}

function getSubtitle(): string {
  const isZh = typeof navigator !== 'undefined' && navigator.language.startsWith('zh');
  return isZh ? '愿今日如云端般宁静。' : 'May your day be calm as clouds.';
}

export default function Greeting() {
  const [greeting, setGreeting] = useState('');
  const subtitle = getSubtitle();

  useEffect(() => {
    const update = () => {
      setGreeting(getGreeting(new Date().getHours()));
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.block}>
      <div className={styles.greeting}>{greeting}</div>
      <div className={styles.subtitle}>{subtitle}</div>
    </div>
  );
}
