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

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

// The original regression test guarded a `max-width: 360px` cap on
// .groupSection that was meant to keep cards from enlarging when
// the sidebar collapsed. The user later reported "为什么没有填满"
// — the cards weren't filling the row. The fix moved sizing into
// the grid (`repeat(auto-fit, minmax(300px, 1fr))`) and removed
// the cap. This file now keeps one targeted guard: the gap is 16px
// (the user explicitly asked for that and we don't want it drifting
// back) and the grid is `auto-fit` (so empty columns collapse and
// cards actually fill the row).

describe('shortcut group card layout (gap + auto-fit)', () => {
  it('.cardsRow declares `repeat(auto-fit, minmax(300px, 1fr))`', () => {
    // This is the single source of truth for "cards fill the row".
    // If a future refactor swaps this back to `repeat(4, 1fr)` the
    // 3-card case will leave a blank 4th column and the user will
    // re-report the same bug — the test fails first.
    const stripped = stripComments(GRID_CSS);
    const ruleMatch = stripped.match(/\.cardsRow\s*\{([^}]*)\}/);
    expect(ruleMatch, '.cardsRow rule should exist').not.toBeNull();
    const body = ruleMatch![1];
    expect(body).toMatch(/grid-template-columns\s*:\s*repeat\(auto-fit,/);
    expect(body).toMatch(/minmax\(\s*300px\s*,\s*1fr\s*\)/);
  });

  it('.cardsRow keeps the 16px gap the user asked for', () => {
    const stripped = stripComments(GRID_CSS);
    const ruleMatch = stripped.match(/\.cardsRow\s*\{([^}]*)\}/);
    expect(ruleMatch, '.cardsRow rule should exist').not.toBeNull();
    expect(ruleMatch![1]).toMatch(/gap\s*:\s*16px/);
  });
});