import React from 'react';
import styles from '../styles/components/LEDDisplay.module.css';

const COLS = 8;
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
        {PATTERN.map((on, i) => {
          const row = Math.floor(i / COLS);
          const col = i % COLS;
          // Diagonal index: 0 = top-left, 14 = bottom-right (max row+col = 14)
          const diagonalIndex = row + col;
          return (
            <div
              key={i}
              className={`${styles.dot} ${on ? '' : styles.off}`}
              style={on ? { '--delay': `${diagonalIndex * 0.1}s` } as React.CSSProperties : undefined}
            />
          );
        })}
      </div>
      <div className={styles.label}>System Active</div>
    </div>
  );
}
