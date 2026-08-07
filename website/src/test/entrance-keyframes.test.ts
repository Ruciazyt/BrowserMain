import { describe, it, expect } from 'vitest';

// The project intentionally avoids `@types/node` (see CLAUDE.md /
// `src/test/setup.ts`), so we use `// @ts-ignore` to read the CSS files
// at runtime via `node:fs` / `node:path`. Vitest's runtime supports
// the Node APIs; the typecheck just needs the suppression.

// @ts-ignore -- no @types/node in this project
import { readFileSync } from 'node:fs';
// @ts-ignore -- no @types/node in this project
import { dirname, resolve } from 'node:path';
// @ts-ignore -- no @types/node in this project
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_MODULE_CSS = readFileSync(
  resolve(__dirname, '../newtab/App.module.css'),
  'utf8',
);

// These tests guard against the regression that motivated their creation:
// `.section` / `.topBar` / `.petCorner` entrance keyframes used to animate
// `opacity 0 → 1` over 320–600ms, which multiplicatively combined with each
// card's intrinsic `--glass-card-opacity` setting. On every page load the
// user saw the cards' visible transparency interpolate from "very faint"
// during the animation to the user's settings value after — a "two values"
// jump on a page that was supposed to just reveal.
//
// The fix is to keep the keyframes transform-only. These tests parse
// `App.module.css` and assert the keyframe `from` blocks do not contain
// `opacity` (or any other animatable property besides `transform`).
// They also assert that the keyframes are still defined and still bound
// to the corresponding `.topBar / .section / .petCorner` rules, so a
// future refactor that removes the entrance animation entirely will fail
// this test (and the maintainer can decide whether to keep or drop the
// animation, restoring the test accordingly).

/** Strip CSS comments so the regexes don't trip on historical examples. */
function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Match a `@keyframes <name> { ... }` block (single level of nesting). */
function extractKeyframes(css: string, name: string): string {
  const re = new RegExp(`@keyframes\\s+${name}\\s*\\{([^}]*)\\}`, 'g');
  const matches = css.match(re);
  if (!matches) return '';
  // Concatenate every block with this name (duplicates are a separate test).
  return matches.join('\n');
}

describe('entrance keyframes stay transform-only', () => {
  it('topBarEnter, sectionEnter, and petEnter are each defined exactly once', () => {
    const stripped = stripComments(APP_MODULE_CSS);
    for (const name of ['topBarEnter', 'sectionEnter', 'petEnter']) {
      const occurrences = (stripped.match(new RegExp(`@keyframes\\s+${name}\\s*\\{`, 'g')) ?? []).length;
      expect(occurrences, `@keyframes ${name} should be defined exactly once`).toBe(1);
    }
  });

  it.each(['topBarEnter', 'sectionEnter', 'petEnter'] as const)(
    '%s does not animate opacity (only transform)',
    (name) => {
      const block = extractKeyframes(stripComments(APP_MODULE_CSS), name);
      expect(block, `${name} keyframe block should exist`).not.toBe('');

      // The `from` step must declare a transform but must not declare
      // any opacity (or visibility, display, etc. — anything that would
      // multiply with the cards' intrinsic `--glass-card-opacity`).
      const fromMatch = block.match(/from\s*\{([^}]*)\}/);
      expect(fromMatch, `${name} should declare a "from" step`).not.toBeNull();
      const fromBody = fromMatch![1];

      expect(
        fromBody,
        `${name} "from" must animate transform so the entrance still has motion`,
      ).toMatch(/transform\s*:/);

      expect(
        fromBody,
        `${name} "from" must NOT animate opacity — it would multiply with the cards' intrinsic glass opacity and produce a visible jump on every page load`,
      ).not.toMatch(/\bopacity\s*:/);

      // Sanity: no other fade-related properties in the `from` step either.
      expect(fromBody).not.toMatch(/\b(visibility|display|filter)\s*:/);
    },
  );

  it('.topBar still binds the topBarEnter animation', () => {
    const stripped = stripComments(APP_MODULE_CSS);
    // The .topBar rule should contain `animation: topBarEnter` (or a
    // shorthand that names topBarEnter). We use a tolerant check:
    //   1. a `.topBar { ... }` rule exists
    //   2. somewhere inside that rule the word `topBarEnter` appears
    //      next to `animation` (so a future copy/paste edit that
    //      detaches the keyframe name is caught).
    const ruleMatch = stripped.match(/\.topBar\s*\{([^}]*)\}/);
    expect(ruleMatch, '.topBar rule should exist').not.toBeNull();
    expect(ruleMatch![1]).toMatch(/animation[^\n;]*topBarEnter/);
  });

  it('.section still binds the sectionEnter animation', () => {
    const stripped = stripComments(APP_MODULE_CSS);
    const ruleMatch = stripped.match(/\.section\s*\{([^}]*)\}/);
    expect(ruleMatch, '.section rule should exist').not.toBeNull();
    expect(ruleMatch![1]).toMatch(/animation[^\n;]*sectionEnter/);
  });

  it('.petCorner still binds the petEnter animation', () => {
    const stripped = stripComments(APP_MODULE_CSS);
    const ruleMatch = stripped.match(/\.petCorner\s*\{([^}]*)\}/);
    expect(ruleMatch, '.petCorner rule should exist').not.toBeNull();
    expect(ruleMatch![1]).toMatch(/animation[^\n;]*petEnter/);
  });
});