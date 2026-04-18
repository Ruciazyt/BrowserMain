import React, { useState, useEffect } from 'react';
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
    const diagonalIndex = row + col; // 0-14
    return diagonalIndex === frame % 15 ? 1 : 0;
  });
}

// Evening: heartbeat -- center pulses, ripples outward
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

// Night: radar scan -- sweeping line rotates across the matrix
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
  { fn: (_) => PATTERN_MORNING,      label: 'Morning'   },  // 6-12
  { fn: buildDiagonalPattern,        label: 'Afternoon' },  // 12-18
  { fn: buildHeartbeatPattern,       label: 'Evening'   },  // 18-24
  { fn: buildRadarPattern,           label: 'Night'     },  // 0-6
];

// ── Helpers ─────────────────────────────────────────────────────
function getTimeOfDayIndex(): number {
  const h = new Date().getHours();
  if (h >= 6  && h < 12) return 0;
  if (h >= 12 && h < 18) return 1;
  if (h >= 18 && h < 24) return 2;
  return 3; // 0-6
}

interface DotLayerProps {
  pattern: number[];
  className?: string;
  style?: React.CSSProperties;
}

function DotLayer({ pattern, className, style }: DotLayerProps) {
  return (
    <div className={`${styles.layer} ${className ?? ''}`} style={style} aria-hidden="true">
      {pattern.map((on, i) => {
        const row = Math.floor(i / COLS);
        const col = i % COLS;
        const diagonalIndex = row + col;
        return (
          <div
            key={i}
            className={`${styles.dot} ${on ? '' : styles.off}`}
            style={on ? ({ '--delay': `${diagonalIndex * 0.1}s` } as React.CSSProperties) : undefined}
          />
        );
      })}
    </div>
  );
}

// ── Component ───────────────────────────────────────────────────
export default function LEDDisplay() {
  const timeIndex = getTimeOfDayIndex();
  const [patternIdx, setPatternIdx] = useState(timeIndex);
  const [nextPatternIdx, setNextPatternIdx] = useState<number | null>(null);
  const [frame, setFrame] = useState(0);

  // Advance animation frame at ~2fps for smooth wave/ripple/scan
  useEffect(() => {
    const id = setInterval(() => setFrame(f => f + 1), 500);
    return () => clearInterval(id);
  }, []);

  // Cycle pattern every 5 seconds with crossfade
  useEffect(() => {
    const id = setInterval(() => {
      setNextPatternIdx(prev => {
        const current = prev !== null ? prev : patternIdx;
        return (current + 1) % PATTERNS.length;
      });
    }, 5000);
    return () => clearInterval(id);
  }, [patternIdx]);

  // After 400ms crossfade completes, commit the new pattern
  useEffect(() => {
    if (nextPatternIdx === null) return;
    const id = setTimeout(() => {
      setPatternIdx(nextPatternIdx);
      setNextPatternIdx(null);
    }, 400);
    return () => clearTimeout(id);
  }, [nextPatternIdx]);

  const currentPattern = PATTERNS[patternIdx].fn(frame);
  const nextPattern = nextPatternIdx !== null ? PATTERNS[nextPatternIdx].fn(frame) : null;
  const label = PATTERNS[patternIdx].label;
  const isTransitioning = nextPatternIdx !== null;

  // Crossfade: current fades 1->0, next fades 0->1 (CSS transition handles the animation)
  const currentStyle: React.CSSProperties = isTransitioning
    ? { opacity: 0, transition: 'opacity 400ms ease-in-out' }
    : { opacity: 1 };

  const nextStyle: React.CSSProperties = isTransitioning
    ? { opacity: 1, transition: 'opacity 400ms ease-in-out' }
    : { opacity: 0 };

  return (
    <div className={styles.container}>
      {/* Grid host -- positions layers; dots live in the layer divs */}
      <div className={styles.dotMatrix}>
        <DotLayer pattern={currentPattern} style={currentStyle} />
        {nextPattern && <DotLayer pattern={nextPattern} style={nextStyle} />}
      </div>
      <div className={styles.label} aria-label={`Time of day: ${label}`}>{label}</div>
    </div>
  );
}
