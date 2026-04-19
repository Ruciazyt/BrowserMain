import { useState, useEffect, useRef } from 'react';
import styles from '../styles/components/Greeting.module.css';

// Cache the language check once at module load — never re-check navigator.language
const IS_ZH = typeof navigator !== 'undefined' && navigator.language.startsWith('zh');

function getGreeting(hour: number): string {
  if (hour >= 0 && hour < 5) return IS_ZH ? '凌晨' : 'GOOD NIGHT';
  if (hour >= 5 && hour < 9) return IS_ZH ? '早上好' : 'GOOD MORNING';
  if (hour >= 9 && hour < 12) return IS_ZH ? '上午好' : 'GOOD MORNING';
  if (hour >= 12 && hour < 14) return IS_ZH ? '中午好' : 'GOOD AFTERNOON';
  if (hour >= 14 && hour < 18) return IS_ZH ? '下午好' : 'GOOD AFTERNOON';
  if (hour >= 18 && hour < 23) return IS_ZH ? '晚上好' : 'GOOD EVENING';
  // hour 23 — midnight hour: 'GOOD NIGHT' in English, '午夜好' (late night) in Chinese
  return IS_ZH ? '午夜好' : 'GOOD NIGHT';
}

export default function Greeting({ userName }: { userName?: string }) {
  const [greeting, setGreeting] = useState('');
  // Track last hour to detect boundary crossings (midnight etc.)
  const lastHourRef = useRef<number>(-1);
  // Trigger re-render when hour changes so greeting text updates immediately
  const [, onHourChange] = useState(0);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const currentHour = now.getHours();
      setGreeting(getGreeting(currentHour));
      // Detect hour boundary crossing (e.g. 23:59 → 00:00 midnight)
      if (currentHour !== lastHourRef.current) {
        lastHourRef.current = currentHour;
        onHourChange((n) => n + 1);
      }
    };
    update();
    // Poll every 60 s — greeting only changes at hour boundaries, 30 s was wasteful
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.wrapper}>
      <div className={styles.greeting}>
        {userName ? `${greeting}, ${userName}` : greeting}
      </div>
    </div>
  );
}
