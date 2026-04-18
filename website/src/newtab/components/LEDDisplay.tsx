import React, { useState, useEffect, useRef } from 'react';
import styles from '../styles/components/LEDDisplay.module.css';

const COLS = 8;
const ROWS = 8;

// ── Pattern Definitions ─────────────────────────────────────────
// Morning: classic checkerboard
const PATTERN_MORNING: number[] = [
  1,0,1,0,1,0,1,0,
  0,1,0,1,0,1,0,1,
  1,0,1,0,1,0,1,0,
  0,1,0,1,0,1,0,1,
  1,0,1,0,1,0,1,0,
  0,1,0,1,0,1,0,1,
  1,0,1,0,1,0,1,0,
  0,1,0,1,0,1,0,1,
];

// Afternoon: diagonal wave (each diagonal lights up sequentially)
function buildDiagonalPattern(frame: number): number[] {
  return Array.from({ length: ROWS * COLS }, (_, i) => {
    const row = Math.floor(i / COLS);
    const col = i % COLS;
    const diagonalIndex = row + col; // 0–14
    return diagonalIndex === frame % 15 ? 1 : 0;
  });
}

// Evening: heartbeat — center pulses, ripples outward
function buildHeartbeatPattern(frame: number): number[] {
  const center = { row: 3.5, col: 3.5 };
  return Array.from({ length: ROWS * COLS }, (_, i) => {
    const row = Math.floor(i / COLS);
    const col = i % COLS;
    const dist = Math.sqrt((row - center.row) ** 2 + (col - center.col) ** 2);
    const ripple = (dist % 3.5);
    return Math.abs(ripple - (frame % 4)) < 0.6 ? 1 : 0;
  });
}

// Night: radar scan — sweeping line rotates across the matrix
function buildRadarPattern(frame: number): number[] {
  const cx = 3.5, cy = 3.5;
  const angle = (frame / 8) * Math.PI; // full sweep every 16 frames (8s at 500ms)
  return Array.from({ length: ROWS * COLS }, (_, i) => {
    const row = Math.floor(i / COLS);
    const col = i % COLS;
    const dx = col - cx, dy = row - cy;
    const dotAngle = Math.atan2(dy, dx);
    let diff = Math.abs(angle - dotAngle);
    if (diff > Math.PI) diff = 2 * Math.PI - diff;
    return diff < 0.45 ? 1 : 0;
  });
}

type PatternFn = (frame: number) => number[];

const PATTERNS: { fn: PatternFn; label: string }[] = [
  { fn: (_) => PATTERN_MORNING,      label: 'Morning'   },  // 6–12
  { fn: buildDiagonalPattern,        label: 'Afternoon' },  // 12–18
  { fn: buildHeartbeatPattern,       label: 'Evening'   },  // 18–24
  { fn: buildRadarPattern,           label: 'Night'     },  // 0–6
];

// ── Helpers ─────────────────────────────────────────────────────
function getTimeOfDayIndex(): number {
  const h = new Date().getHours();
  if (h >= 6  && h < 12) return 0;
  if (h >= 12 && h < 18) return 1;
  if (h >= 18 && h < 24) return 2;
  return 3; // 0–6
}

// ── Component ───────────────────────────────────────────────────
export default function LEDDisplay() {
  const timeIndex = useRef(getTimeOfDayIndex());
  const [oldPatternIdx, setOldPatternIdx] = useState(timeIndex.current);
  const [newPatternIdx, setNewPatternIdx] = useState(timeIndex.current);
  const [frame, setFrame] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Cycle pattern every 5 seconds with crossfade transition
  useEffect(() => {
    const id = setInterval(() => {
      setNewPatternIdx(i => (i + 1) % PATTERNS.length);
      setIsTransitioning(true);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  // After 400ms crossfade completes: lock in final opacity states
  useEffect(() => {
    if (!isTransitioning) return;
    const id = setTimeout(() => {
      setOldPatternIdx(newPatternIdx);
      setIsTransitioning(false);
    }, 400);
    return () => clearTimeout(id);
  }, [isTransitioning, newPatternIdx]);

  // Advance animation frame at ~2fps for smooth wave/ripple/scan
  useEffect(() => {
    const id = setInterval(() => setFrame(f => f + 1), 500);
    return () => clearInterval(id);
  }, []);

  const oldPattern = PATTERNS[oldPatternIdx].fn(frame);
  const newPattern = PATTERNS[newPatternIdx].fn(frame);
  const label = PATTERNS[newPatternIdx].label;

  // Crossfade: old fades 1→0, new fades 0→1 (both over 400ms)
  // When transition ends, lock both to their final values inline so CSS class doesn't override.
  const oldLayerStyle: React.CSSProperties = isTransitioning
    ? { opacity: 0, transition: 'opacity 400ms ease-in-out' }
    : { opacity: 0 }; // resting: invisible

  const newLayerStyle: React.CSSProperties = isTransitioning
    ? { opacity: 1, transition: 'opacity 400ms ease-in-out' }
    : { opacity: 1 }; // resting: visible

  return (
    <div className={styles.container}>
      <div className={styles.dotMatrix}>
        {/* Old pattern layer — fades out during crossfade */}
        <div className={`${styles.dotMatrix} ${styles.layer} ${styles.oldLayer}`} style={oldLayerStyle}>
          {oldPattern.map((on, i) => {
            const row = Math.floor(i / COLS);
            const col = i % COLS;
            const diagonalIndex = row + col;
            return (
              <div
                key={i}
                className={`${styles.dot} ${on ? '' : styles.off}`}
                style={
                  on
                    ? ({ '--delay': `${diagonalIndex * 0.1}s` } as React.CSSProperties)
                    : undefined
                }
              />
            );
          })}
        </div>
        {/* New pattern layer — fades in during crossfade */}
        <div className={`${styles.dotMatrix} ${styles.layer} ${styles.newLayer}`} style={newLayerStyle}>
          {newPattern.map((on, i) => {
            const row = Math.floor(i / COLS);
            const col = i % COLS;
            const diagonalIndex = row + col;
            return (
              <div
                key={i}
                className={`${styles.dot} ${on ? '' : styles.off}`}
                style={
                  on
                    ? ({ '--delay': `${diagonalIndex * 0.1}s` } as React.CSSProperties)
                    : undefined
                }
              />
            );
          })}
        </div>
      </div>
      <div className={styles.label}>{label}</div>
    </div>
  );
}
