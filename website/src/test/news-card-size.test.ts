import { describe, it, expect } from 'vitest';

// @ts-ignore -- no @types/node in this project
import { readFileSync } from 'node:fs';
// @ts-ignore -- no @types/node in this project
import { dirname, resolve } from 'node:path';
// @ts-ignore -- no @types/node in this project
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const NEWS_CSS = readFileSync(
  resolve(__dirname, '../newtab/components/widgets/NewsSection/NewsSection.module.css'),
  'utf8',
);
const GRID_CSS = readFileSync(
  resolve(__dirname, '../newtab/components/shortcuts/ShortcutGrid/ShortcutGrid.module.css'),
  'utf8',
);

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

// The original regression test guarded a `max-width: 360px` cap on
// .card. The user then reported "为什么没有填满" (cards weren't
// filling the row) and we moved sizing to the grid via
// `repeat(auto-fit, minmax(300px, 1fr))`. The cap is gone. This
// file keeps two targeted guards: the news grid uses the same
// auto-fit + minmax system as the shortcut grid, and the news .card
// has no width cap of its own (the grid is the single source of
// truth for card sizing).

describe('news card layout (unified with the shortcut grid)', () => {
  function readRule(css: string, selector: string): string {
    const stripped = stripComments(css);
    const re = new RegExp(`\\${selector}\\s*\\{([^}]*)\\}`);
    const m = stripped.match(re);
    expect(m, `${selector} rule should exist`).not.toBeNull();
    return m![1];
  }

  it('.grid (news) uses the same auto-fit + minmax(300px, 1fr) as the shortcut row', () => {
    const newsBody = readRule(NEWS_CSS, '.grid');
    const gridBody = readRule(GRID_CSS, '.cardsRow');

    const extractTemplate = (s: string) => {
      const m = s.match(/grid-template-columns\s*:\s*repeat\(([^,]+),\s*([^)]+)\)/);
      expect(m, 'grid-template-columns must use repeat()').not.toBeNull();
      return { fn: m![1].trim(), template: m![2].trim() };
    };

    const news = extractTemplate(newsBody);
    const grid = extractTemplate(gridBody);

    expect(news.fn, '.grid must use auto-fit (not auto-fill) so empty columns collapse').toBe('auto-fit');
    expect(grid.fn, '.cardsRow must use auto-fit').toBe('auto-fit');
    expect(news.template, '.grid minmax must match .cardsRow so the two rows read as one grid system')
      .toBe(grid.template);
  });

  it('.grid (news) keeps the 16px gap the user asked for', () => {
    const body = readRule(NEWS_CSS, '.grid');
    expect(body).toMatch(/gap\s*:\s*16px/);
  });

  it('.card (news) no longer caps its own width (the grid is the source of truth)', () => {
    const body = readRule(NEWS_CSS, '.card');
    expect(
      body,
      '.card must not have its own max-width — the grid now sizes cards via minmax',
    ).not.toMatch(/max-width\s*:/);
  });
});