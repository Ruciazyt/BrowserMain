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
const GLOBAL_CSS = readFileSync(
  resolve(__dirname, '../newtab/global.css'),
  'utf8',
);

// `.glass-card` rules live in `global.css` and own the smooth interpolation
// between settings changes (slider drags in SettingsPanel). They must NOT be
// removed, otherwise:
//
//   * Modern browsers lose the explicit `transition` glue that complements
//     the typed `@property` registrations above the rule. Some browsers
//     (older Safari, older Firefox) skip re-evaluation of the composited
//     backdrop-filter layer without it — cards stop updating.
//
// These tests pin the rule shape so a future cleanup can't quietly remove
// the transition without breaking the smooth-settings-update behaviour.

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

describe('.glass-card transition rule', () => {
  it('declares a transition that covers backdrop-filter, background, and box-shadow', () => {
    const stripped = stripComments(GLOBAL_CSS);
    const ruleMatch = stripped.match(/\.glass-card\s*\{([^}]*)\}/);
    expect(ruleMatch, '.glass-card rule should exist').not.toBeNull();
    const body = ruleMatch![1];

    // Pull out the `transition: ...;` declaration. It may be multi-line
    // and sit between other declarations; capture everything up to the
    // next semicolon.
    const transitionMatch = body.match(/transition\s*:([^;]+);/);
    expect(transitionMatch, '.glass-card must declare a transition').not.toBeNull();

    const transitionValue = transitionMatch![1].toLowerCase();
    for (const property of ['backdrop-filter', '-webkit-backdrop-filter', 'background', 'box-shadow']) {
      expect(
        transitionValue,
        `.glass-card transition must cover ${property}`,
      ).toContain(property);
    }
  });

  it('@property declarations are kept (so typed variables animate)', () => {
    const stripped = stripComments(GLOBAL_CSS);
    for (const name of [
      '--glass-card-blur',
      '--glass-card-saturation',
      '--glass-card-opacity',
      '--glass-card-shadow-intensity',
      '--glass-card-tint-color',
    ]) {
      expect(
        stripped.includes(`@property ${name}`),
        `@property ${name} must be declared so dependent backdrop-filter / background updates stay smooth`,
      ).toBe(true);
    }
  });
});