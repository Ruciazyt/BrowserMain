import { useState, useEffect, useRef } from 'react';
import { useI18n } from '../i18n';
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

export default function Greeting({ userName }: { userName?: string }) {
  const { isZh, t } = useI18n();
  const [greeting, setGreeting] = useState('');
  const lastHourRef = useRef<number>(-1);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const currentHour = now.getHours();
      setGreeting(getGreeting(currentHour, isZh));
      if (currentHour !== lastHourRef.current) {
        lastHourRef.current = currentHour;
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
        <div className={styles.subtitle}>{t('greetingSubtitle')}</div>
      </div>
    </div>
  );
}
