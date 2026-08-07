import { describe, it, expect } from 'vitest';

// @ts-ignore -- no @types/node in this project
import { readFileSync } from 'node:fs';
// @ts-ignore -- no @types/node in this project
import { dirname, resolve } from 'node:path';
// @ts-ignore -- no @types/node in this project
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GRID_CSS = readFileSync(
  resolve(__dirname, '../newtab/components/shortcuts/ShortcutGrid/ShortcutGrid.module.css'),
  'utf8',
);
const NEWS_CSS = readFileSync(
  resolve(__dirname, '../newtab/components/widgets/NewsSection/NewsSection.module.css'),
  'utf8',
);

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

// The user-facing complaint (round 2): cards weren't filling the
// row. The previous grid was `repeat(4, 1fr)` plus a `max-width:
// 360px` cap on each card, so when the user had 3 groups the 4th
// column was empty (cards were 1/4 row width) and the cards were
// further capped at 360px, leaving visible whitespace on the right
// edge of the row. The fix: `repeat(auto-fit, minmax(300px, 1fr))`
// collapses empty tracks and expands each card to fill its column,
// with no `max-width` cap. Both the shortcut row and the news row
// use the same system so they read as one consistent grid.

describe('card grid layout', () => {
  function readRule(css: string, selector: string): string {
    const stripped = stripComments(css);
    const re = new RegExp(`\\${selector}\\s*\\{([^}]*)\\}`);
    const m = stripped.match(re);
    expect(m, `${selector} rule should exist`).not.toBeNull();
    return m![1];
  }

  it('.cardsRow uses auto-fit + minmax so cards fill the row (no empty 4th column)', () => {
    const body = readRule(GRID_CSS, '.cardsRow');
    // `auto-fit` (not `auto-fill`) is what collapses empty tracks —
    // the user reported cards weren't filling the row precisely because
    // auto-fill would leave the empty 4th column visible.
    expect(body).toMatch(/grid-template-columns\s*:\s*repeat\(auto-fit,/);
    // 300px minimum keeps the cards readable on narrow viewports.
    expect(body).toMatch(/minmax\(\s*300px\s*,\s*1fr\s*\)/);
  });

  it('.cardsRow keeps the 16px gap (unified with the news grid)', () => {
    const body = readRule(GRID_CSS, '.cardsRow');
    expect(body).toMatch(/gap\s*:\s*16px/);
  });

  it('.groupSection no longer caps the card width (let the grid size it)', () => {
    // The previous `max-width: 360px; justify-self: center;` is what
    // was preventing cards from filling the row. The grid now sizes
    // them via minmax, so the cap is gone.
    const stripped = stripComments(GRID_CSS);
    const blocks = stripped.match(/\.groupSection\s*\{[^}]*\}/g) ?? [];
    const layoutBlock = blocks.find((b) => /justify-self\s*:\s*center/.test(b));
    expect(
      layoutBlock,
      '.groupSection should no longer carry justify-self: center (the grid now sizes the card via minmax)',
    ).toBeUndefined();
    const widthCapped = blocks.find((b) => /max-width\s*:\s*\d+px/.test(b));
    expect(
      widthCapped,
      '.groupSection should no longer cap the card width (the grid now sizes the card via minmax)',
    ).toBeUndefined();
  });

  it('.grid (news) uses the same auto-fit + minmax system as the shortcut row', () => {
    const body = readRule(NEWS_CSS, '.grid');
    expect(body).toMatch(/grid-template-columns\s*:\s*repeat\(auto-fit,/);
    expect(body).toMatch(/minmax\(\s*300px\s*,\s*1fr\s*\)/);
  });

  it('.grid (news) keeps the 16px gap (unified with the shortcut row)', () => {
    const body = readRule(NEWS_CSS, '.grid');
    expect(body).toMatch(/gap\s*:\s*16px/);
  });

  it('.card (news) no longer caps its own width (matches the shortcut rule)', () => {
    // The two rows used to share an explicit `max-width: 360px` cap.
    // The cap is gone now; the grid's minmax is the single source of
    // truth for card sizing.
    const body = readRule(NEWS_CSS, '.card');
    expect(body, '.card must not have a max-width (the grid sizes it via minmax)').not.toMatch(/max-width\s*:/);
  });
});