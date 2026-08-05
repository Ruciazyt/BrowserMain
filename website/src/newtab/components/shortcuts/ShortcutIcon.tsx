import { useEffect, useRef, useState } from 'react';
import { getFaviconIcoUrl, getSmartFaviconUrl } from '../../utils/storage';

const FAVICON_ATTEMPT_TIMEOUT_MS = 1500;

interface ShortcutIconProps {
  url: string;
  favicon?: string;
  title: string;
  /**
   * If true, uses larger fallback sizing (e.g. for the drag preview
   * well). Controls only the fallback's font size; the favicon itself
   * is always sized by the parent.
   */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  alt?: string;
  onResolvedFavicon?: (favicon: string) => void;
}

/**
 * Render the favicon for a shortcut with a graceful fallback chain:
 *
 *   1. The shortcut's stored `favicon` URL, if any.
 *   2. The site's `/favicon.ico`.
 *   3. Google S2 (`/s2/favicons?domain=…`).
 *   4. A first-letter "avatar" of the title on a tinted background.
 *
 * Steps 2–3 only run on `onError` of the previous attempt, so we never
 * pay for them when the stored favicon loads. Step 4 is the true
 * guarantee — every shortcut has a visible icon, even when the site
 * ships no favicon at all or blocks third-party favicon services.
 */
export function ShortcutIcon({
  url,
  favicon,
  title,
  size = 'md',
  className,
  alt = '',
  onResolvedFavicon,
}: ShortcutIconProps) {
  const candidates = Array.from(new Set([
    favicon,
    url ? getFaviconIcoUrl(url) : '',
    url ? getSmartFaviconUrl(url) : '',
  ].filter((candidate): candidate is string => !!candidate)));
  const [attempt, setAttempt] = useState(0);
  const timeoutRef = useRef<number | null>(null);
  const src = candidates[attempt] ?? null;

  const clearAttemptTimeout = () => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  useEffect(() => {
    clearAttemptTimeout();
    setAttempt(0);
  }, [favicon, url]);

  useEffect(() => {
    if (!src) return;
    timeoutRef.current = window.setTimeout(() => {
      setAttempt((current) => current + 1);
    }, FAVICON_ATTEMPT_TIMEOUT_MS);
    return clearAttemptTimeout;
  }, [src]);

  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        draggable={false}
        onError={() => {
          clearAttemptTimeout();
          setAttempt((current) => current + 1);
        }}
        onLoad={() => {
          clearAttemptTimeout();
          if (src !== favicon) onResolvedFavicon?.(src);
        }}
      />
    );
  }

  return <FallbackAvatar title={title} url={url} size={size} className={className} />;
}

interface FallbackAvatarProps {
  title: string;
  url: string;
  size: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Renders a small avatar built from the first letter of the title (or
 * the first character of the domain) on a deterministic tinted
 * background. Always visible, so a shortcut never appears as a blank
 * square in the grid or in the drag preview.
 */
function FallbackAvatar({ title, url, size, className }: FallbackAvatarProps) {
  const letter = pickAvatarLetter(title, url);
  const tint = pickAvatarTint(title, url);
  const fontSize = size === 'lg' ? 22 : size === 'sm' ? 11 : 16;
  return (
    <div
      className={className}
      aria-hidden="true"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        borderRadius: 'inherit',
        background: tint.background,
        color: tint.foreground,
        fontWeight: 600,
        fontSize,
        lineHeight: 1,
        textTransform: 'uppercase',
        fontFamily: 'var(--font-ui, system-ui, -apple-system, sans-serif)',
        userSelect: 'none',
        letterSpacing: '-0.02em',
      }}
    >
      {letter}
    </div>
  );
}

function pickAvatarLetter(title: string, url: string): string {
  const trimmed = (title || '').trim();
  if (trimmed) {
    // Use the first visible character; works for CJK titles too.
    for (const ch of trimmed) {
      if (!/\s/.test(ch)) return ch;
    }
    return trimmed[0] ?? '?';
  }
  // No title — fall back to the domain's first letter.
  try {
    const { hostname } = new URL(url);
    return (hostname[0] ?? '?').toUpperCase();
  } catch {
    return '?';
  }
}

const AVATAR_TINTS: Array<{ background: string; foreground: string }> = [
  { background: '#5B8DEF', foreground: '#ffffff' },
  { background: '#7A5AF8', foreground: '#ffffff' },
  { background: '#22A06B', foreground: '#ffffff' },
  { background: '#E58A00', foreground: '#ffffff' },
  { background: '#D14343', foreground: '#ffffff' },
  { background: '#0CA6E9', foreground: '#ffffff' },
  { background: '#6B6B6B', foreground: '#ffffff' },
];

function pickAvatarTint(title: string, url: string) {
  const key = (title || url || '').toString();
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return AVATAR_TINTS[hash % AVATAR_TINTS.length];
}
