import { useState, useEffect } from 'react';
import styles from '../styles/components/Greeting.module.css';

function getGreeting(hour: number): string {
  if (hour >= 5 && hour < 12) return 'GOOD MORNING';
  if (hour >= 12 && hour < 18) return 'GOOD AFTERNOON';
  if (hour >= 18 && hour < 21) return 'GOOD EVENING';
  return 'GOOD NIGHT';
}

export default function Greeting() {
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setGreeting(getGreeting(now.getHours()));
    };
    update();
    // Update every minute in case of midnight crossover
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.greeting}>
      {greeting}
    </div>
  );
}
