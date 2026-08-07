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

// The user-facing complaint: the gap between cards (both inside
// the shortcut row and between the two news cards) read as too
// large. The user picked 16px as the desired value. These tests pin
// both grids to 16px so a future "let me make it 20px" tweak has
// to consciously update both.

describe('card grid gap', () => {
  function readGap(css: string, selector: string): number {
    const stripped = stripComments(css);
    const ruleMatch = stripped.match(new RegExp(`\\${selector}\\s*\\{([^}]*)\\}`));
    expect(ruleMatch, `${selector} rule should exist`).not.toBeNull();
    const m = ruleMatch![1].match(/gap\s*:\s*(\d+)px/);
    expect(m, `${selector} must declare a gap in px`).not.toBeNull();
    return Number(m![1]);
  }

  it('.cardsRow (shortcut grid) gap is 16px', () => {
    expect(readGap(GRID_CSS, '.cardsRow')).toBe(16);
  });

  it('.grid (news) gap is 16px — same as .cardsRow so the two rows read as one grid system', () => {
    expect(readGap(NEWS_CSS, '.grid')).toBe(16);
  });
});