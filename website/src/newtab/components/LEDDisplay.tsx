import React, { useState, useEffect, useRef, useMemo } from 'react';
import styles from '../styles/components/LEDDisplay.module.css';

const COLS = 8;
const ROWS = 8;

// ── 5×7 Dot-Matrix Font ─────────────────────────────────────────
// Each character: 7 rows × 5 columns. Each row stored as an 8-bit
// integer; bit 4 (value 16) is the leftmost dot. 0=off, 1=on.
const FONT_5x7: Record<string, number[]> = {
  '0': [0x1F, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1F], // 011111 10001 10001 10001 10001 10001 11111
  '1': [0x04, 0x07, 0x04, 0x04, 0x04, 0x04, 0x0F], // 00100  00111 00100 00100 00100 00100 01111
  '2': [0x1F, 0x01, 0x01, 0x0F, 0x10, 0x10, 0x1F], // 11111 00001 00001 01111 10000 10000 11111
  '3': [0x1F, 0x01, 0x01, 0x0F, 0x01, 0x01, 0x1F], // 11111 00001 00001 01111 00001 00001 11111
  '4': [0x11, 0x11, 0x11, 0x1F, 0x01, 0x01, 0x01], // 10001 10001 10001 11111 00001 00001 00001
  '5': [0x1F, 0x10, 0x10, 0x1F, 0x01, 0x01, 0x1F], // 11111 10000 10000 11111 00001 00001 11111
  '6': [0x1F, 0x10, 0x10, 0x1F, 0x11, 0x11, 0x1F], // 11111 10000 10000 11111 10001 10001 11111
  '7': [0x1F, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01], // 11111 00001 00001 00001 00001 00001 00001
  '8': [0x1F, 0x11, 0x11, 0x1F, 0x11, 0x11, 0x1F], // 11111 10001 10001 11111 10001 10001 11111
  '9': [0x1F, 0x11, 0x11, 0x1F, 0x01, 0x01, 0x1F], // 11111 10001 10001 11111 00001 00001 11111
  'W': [0x1F, 0x11, 0x11, 0x1F, 0x11, 0x11, 0x11], // 11111 10001 10001 11111 10001 10001 10001
  'D': [0x1F, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1F], // 11111 10001 10001 10001 10001 10001 11111
  ':': [0x00, 0x04, 0x04, 0x00, 0x04, 0x04, 0x00], // 00100 00100 00000 00100 00100 00000
  '-': [0x00, 0x00, 0x00, 0x1F, 0x00, 0x00, 0x00], // 11111
  '.': [0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x04], // 00100 00100
  ' ': [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
};

type CharBitmap = number[];

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

// ── Ticker ─────────────────────────────────────────────────────
// Renders a string as a scrolling flex row of dot-columns.
// Each character maps to a 5×7 bitmap via FONT_5x7.
interface TickerProps {
  text: string;
}

function Ticker({ text }: TickerProps) {
  // Pre-render the full ticker content twice for seamless looping.
  // Each "char cell" is 7 dots high; each char is 5 dots wide plus a 1-dot gap.
  const chars = useMemo(() => text.split(''), [text]);

  // Build a stable duplicated array so React keys stay stable
  const doubled = useMemo(() => [...chars, ...chars], [chars]);

  return (
    <div className={styles.ticker} aria-hidden="true">
      <div className={styles.tickerTrack}>
        {doubled.map((char, globalIdx) => (
          <CharCell key={`${char}-${globalIdx}`} char={char} />
        ))}
      </div>
    </div>
  );
}

interface CharCellProps {
  char: string;
}

function CharCell({ char }: CharCellProps) {
  const bitmap: CharBitmap = FONT_5x7[char] ?? FONT_5x7[' '];
  return (
    <div className={styles.charCell}>
      {bitmap.map((rowBits, rowIdx) => (
        <div key={rowIdx} className={styles.charRow}>
          {/* col 4..0 → left to right. bit 4 (16) is leftmost. */}
          {([4, 3, 2, 1, 0]).map(bitIdx => (
            <div
              key={bitIdx}
              className={`${styles.tickerDot} ${(rowBits & (1 << bitIdx)) ? '' : styles.off}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Component ───────────────────────────────────────────────────
export default function LEDDisplay() {
  const timeIndex = getTimeOfDayIndex();
  const [patternIdx, setPatternIdx] = useState(timeIndex);
  const [nextPatternIdx, setNextPatternIdx] = useState<number | null>(null);
  const [frame, setFrame] = useState(0);
  const [tickerText, setTickerText] = useState(() => buildTickerText());

  // Advance animation frame at ~2fps for smooth wave/ripple/scan
  useEffect(() => {
    const id = setInterval(() => setFrame(f => f + 1), 500);
    return () => clearInterval(id);
  }, []);

  // Update ticker text every second
  useEffect(() => {
    const id = setInterval(() => setTickerText(buildTickerText()), 1000);
    return () => clearInterval(id);
  }, []);

  // Switch pattern when the time-of-day period changes (hour boundary crossing)
  useEffect(() => {
    if (nextPatternIdx !== null) return;
    const newIdx = getTimeOfDayIndex();
    if (newIdx !== patternIdx) {
      setNextPatternIdx(newIdx);
    }
  }, [patternIdx, nextPatternIdx, frame]);

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

      {/* Live scrolling ticker strip */}
      <Ticker text={tickerText} />
    </div>
  );
}

// ── Ticker text builder ─────────────────────────────────────────
function buildTickerText(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const yyyy = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');

  // ISO week number
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000);
  const isoWeek = String(Math.ceil((days + startOfYear.getDay() + 1) / 7)).padStart(2, '0');

  // Day of year
  const startOfYear2 = new Date(now.getFullYear(), 0, 1);
  const doy = String(Math.ceil((now.getTime() - startOfYear2.getTime()) / 86400000) + 1).padStart(3, '0');

  return `W${isoWeek} D${doy} ${hh}:${mm} ${yyyy}-${mo}-${dd}`;
}
