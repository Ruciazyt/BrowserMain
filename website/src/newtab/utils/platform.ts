// Returns true if the user is on macOS
export function isMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  const platform = navigator.platform ?? '';
  const ua = navigator.userAgent ?? '';
  const uaData = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData;
  return (
    platform.toLowerCase().includes('mac') ||
    ua.toLowerCase().includes('mac') ||
    (typeof uaData !== 'undefined' &&
      typeof uaData.platform === 'string' &&
      uaData.platform.toLowerCase().includes('mac'))
  );
}

// Returns the display label for the primary modifier key
export function modKey(): string {
  return isMac() ? '⌘' : 'Ctrl';
}
