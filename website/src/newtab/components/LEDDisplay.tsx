import styles from '../styles/components/LEDDisplay.module.css';

const PATTERN = [
  1,0,1,0,1,0,1,0,
  0,1,0,1,0,1,0,1,
  1,0,1,0,1,0,1,0,
  0,1,0,1,0,1,0,1,
  1,0,1,0,1,0,1,0,
  0,1,0,1,0,1,0,1,
  1,0,1,0,1,0,1,0,
  0,1,0,1,0,1,0,1,
];

export default function LEDDisplay() {
  return (
    <div className={styles.container}>
      <div className={styles.dotMatrix}>
        {PATTERN.map((on, i) => (
          <div
            key={i}
            className={`${styles.dot} ${on ? '' : styles.off}`}
          />
        ))}
      </div>
      <div className={styles.label}>System Active</div>
    </div>
  );
}