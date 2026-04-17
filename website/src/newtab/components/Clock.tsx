import { useState, useEffect } from 'react';
import styles from '../styles/components/Clock.module.css';

const DECORATIVE_DOTS = [1, 0, 1, 0, 1, 0, 1, 0];

export default function Clock() {
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');
  const [day, setDay] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const hh = now.getHours().toString().padStart(2, '0');
      const mm = now.getMinutes().toString().padStart(2, '0');
      const ss = now.getSeconds().toString().padStart(2, '0');
      setTime(`${hh}:${mm}:${ss}`);
      const yyyy = now.getFullYear();
      const mo = (now.getMonth() + 1).toString().padStart(2, '0');
      const dd = now.getDate().toString().padStart(2, '0');
      setDate(`${yyyy}-${mo}-${dd}`);
      setDay(now.toLocaleDateString('en-US', { weekday: 'long' }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.panel}>
      <div className={styles.dotRow}>
        {DECORATIVE_DOTS.map((on, i) => (
          <div key={i} className={`${styles.dot} ${on ? '' : styles.dotOff}`} />
        ))}
      </div>
      <div className={styles.container}>
        <div className={styles.time}>{time}</div>
        <div className={styles.date}>{date}</div>
        <div className={styles.day}>{day}</div>
      </div>
    </div>
  );
}
