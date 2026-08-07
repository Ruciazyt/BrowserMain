import { describe, it, expect } from 'vitest';

// @ts-ignore -- no @types/node in this project
import { readFileSync } from 'node:fs';
// @ts-ignore -- no @types/node in this project
import { dirname, resolve } from 'node:path';
// @ts-ignore -- no @types/node in this project
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SETTINGS_PANEL_CSS = readFileSync(
  resolve(__dirname, '../newtab/components/settings/SettingsPanel/SettingsPanel.module.css'),
  'utf8',
);
const GLOBAL_CSS = readFileSync(
  resolve(__dirname, '../newtab/global.css'),
  'utf8',
);

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

// These tests guard against the regression that motivated them: the
// settings panel was opening with a transform-based slide, but the
// user found that "still appears directly" because the `transform`
// change competed with the .glass-card / .wrapper `transition: all
// 0.4s` cascade and with React's commit timing, and the slide was
// getting eaten. The fix is a pure cross-fade via `opacity` only —
// no `transform` change, so the panel sits in place and just fades
// in/out. The duration was bumped to 700ms so the user can read it
// as motion. These tests pin that contract so a future "let me
// make it slide in again" change fails the test until the underlying
// cause is fixed.

describe('settings panel transition rules', () => {
  it('.overlay declares a transition that animates opacity (≥600ms)', () => {
    const stripped = stripComments(SETTINGS_PANEL_CSS);
    const ruleMatch = stripped.match(/\.overlay\s*\{([^}]*)\}/);
    expect(ruleMatch, '.overlay rule should exist').not.toBeNull();
    const body = ruleMatch![1];

    const transitionMatch = body.match(/transition\s*:([^;]+);/);
    expect(transitionMatch, '.overlay must declare a transition').not.toBeNull();

    const transitionValue = transitionMatch![1].toLowerCase();
    expect(transitionValue).toContain('opacity');

    const durationMatch = transitionValue.match(/(\d+(?:\.\d+)?)(ms|s)/);
    expect(durationMatch, '.overlay transition must declare a duration').not.toBeNull();
    const ms = durationMatch![2] === 's' ? Number(durationMatch![1]) * 1000 : Number(durationMatch![1]);
    expect(ms, '.overlay fade-in must be at least 600ms — should keep pace with the panel fade-in').toBeGreaterThanOrEqual(600);
  });

  it('.overlay is initially opacity: 0 and flips to 1 when open', () => {
    const stripped = stripComments(SETTINGS_PANEL_CSS);
    const ruleMatch = stripped.match(/\.overlay\s*\{([^}]*)\}/);
    expect(ruleMatch, '.overlay rule should exist').not.toBeNull();
    expect(ruleMatch![1]).toMatch(/opacity\s*:\s*0\b/);

    const openMatch = stripped.match(/\.overlay\.open\s*\{([^}]*)\}/);
    expect(openMatch, '.overlay.open rule should exist').not.toBeNull();
    expect(openMatch![1]).toMatch(/opacity\s*:\s*1\b/);
  });

  it('.panel declares a transition that animates opacity (pure fade — no transform)', () => {
    const stripped = stripComments(SETTINGS_PANEL_CSS);
    const ruleMatch = stripped.match(/\.panel\s*\{([^}]*)\}/);
    expect(ruleMatch, '.panel rule should exist').not.toBeNull();
    const body = ruleMatch![1];

    const transitionMatch = body.match(/transition\s*:([^;]+);/);
    expect(transitionMatch, '.panel must declare a transition').not.toBeNull();

    const transitionValue = transitionMatch![1].toLowerCase();
    // Pure cross-fade — the user wanted a "fade in/out" effect. The
    // earlier transform-based slide was fragile; opacity-only is the
    // contract from now on.
    expect(transitionValue).toContain('opacity');
    expect(transitionValue, '.panel transition must NOT cover transform — that was the source of the "appears directly" bug').not.toContain('transform');

    const durationMatch = transitionValue.match(/(\d+(?:\.\d+)?)(ms|s)/);
    expect(durationMatch, '.panel transition must declare a duration').not.toBeNull();
    const ms = durationMatch![2] === 's' ? Number(durationMatch![1]) * 1000 : Number(durationMatch![1]);
    expect(ms, '.panel fade must be at least 600ms — the user found shorter values too quick').toBeGreaterThanOrEqual(600);
  });

  it('.panel is initially opacity: 0 and flips to 1 when open', () => {
    const stripped = stripComments(SETTINGS_PANEL_CSS);
    const ruleMatch = stripped.match(/\.panel\s*\{([^}]*)\}/);
    expect(ruleMatch, '.panel rule should exist').not.toBeNull();
    expect(ruleMatch![1]).toMatch(/opacity\s*:\s*0\b/);

    const openMatch = stripped.match(/\.panel\.open\s*\{([^}]*)\}/);
    expect(openMatch, '.panel.open rule should exist').not.toBeNull();
    expect(openMatch![1]).toMatch(/opacity\s*:\s*1\b/);
  });

  it('.panel has pointer-events: none when closed and auto when open (does not block clicks on right side of page)', () => {
    // The user reported: clicks on the right side of the home page
    // (engine selector in the search bar, news refresh button,
    // PixelPet) were not registering. Root cause: the .panel is
    // `position: fixed; top: 16px; right: 16px; bottom: 16px;
    // width: 360px` and was rendered with `opacity: 0` BUT no
    // `pointer-events: none`. The invisible panel still captured
    // every click in its area. The fix is to flip pointer-events
    // alongside opacity so the panel only intercepts clicks when
    // it is actually shown. The neighbouring `.overlay` already
    // had this guard — `.panel` was missed.
    const stripped = stripComments(SETTINGS_PANEL_CSS);
    const ruleMatch = stripped.match(/\.panel\s*\{([^}]*)\}/);
    expect(ruleMatch, '.panel rule should exist').not.toBeNull();
    expect(
      ruleMatch![1],
      '.panel must set `pointer-events: none` while closed so it does not silently block clicks on the right side of the page (engine selector / refresh / pet)',
    ).toMatch(/pointer-events\s*:\s*none/);

    const openMatch = stripped.match(/\.panel\.open\s*\{([^}]*)\}/);
    expect(openMatch, '.panel.open rule should exist').not.toBeNull();
    expect(
      openMatch![1],
      '.panel.open must re-enable pointer-events so the open panel itself can be clicked (text selection, links, scroll inside the panel)',
    ).toMatch(/pointer-events\s*:\s*auto/);
  });
});

describe('prefers-reduced-motion: reduce must NOT kill the settings-panel cross-fade', () => {
  // The previous version of the reduced-motion block set
  //   `*, *::before, *::after { transition-duration: 0.001ms !important; }`
  // which silently crushed the panel's 700ms opacity fade to a
  // 0.001ms "snap" on any system that honored the preference. The
  // fix is to drop the `transition-duration` line — only kill
  // keyframe animations. This test pins the absence so the bug
  // doesn't sneak back in.
  it('prefers-reduced-motion block does not set `transition-duration: 0.001ms`', () => {
    const stripped = stripComments(GLOBAL_CSS);
    // Match the @media (prefers-reduced-motion: reduce) { ... } block.
    // Use [\s\S] to span newlines since the block has multi-line rules.
    const blockMatch = stripped.match(
      /@media\s+\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\}\s*(?=@media|\Z)/,
    );
    expect(blockMatch, 'prefers-reduced-motion block should exist').not.toBeNull();
    const block = blockMatch![0];

    // The fix: no `transition-duration` declaration inside the
    // reduced-motion block. The only `*` rule should be
    // animation-duration / animation-iteration-count / scroll-behavior.
    expect(
      block,
      'prefers-reduced-motion must not set transition-duration: 0.001ms — that kills the settings-panel cross-fade for users with reduced motion enabled',
    ).not.toMatch(/transition-duration\s*:\s*0\.001ms/);
  });
});

describe('--dur-* tokens stay duration-only (no compound value)', () => {
  // If `--dur-fast` ever becomes `150ms ease-out` again, callers like
  // `transition: opacity var(--dur-spring) var(--ease-smooth)` will
  // receive `opacity 320ms cubic-bezier(...) cubic-bezier(...)` after
  // substitution. The CSS transition shorthand parser sees two
  // timing-function tokens and may discard the whole declaration on
  // some browsers, silently killing the slide-in animation.
  it.each(['--dur-fast', '--dur-mid', '--dur-spring'] as const)(
    '%s is a bare <time> value (no easing baked in)',
    (name) => {
      const stripped = stripComments(GLOBAL_CSS);
      const re = new RegExp(`${name}\\s*:\\s*([^;]+);`);
      const match = stripped.match(re);
      expect(match, `${name} must be declared`).not.toBeNull();

      const value = match![1].trim();
      // A bare duration token contains only a numeric time unit
      // (`ms` / `s`); it must NOT contain a cubic-bezier / `ease*`
      // keyword / `linear` etc.
      expect(
        value,
        `${name} must be a single time value (got: "${value}")`,
      ).toMatch(/^\d+(?:\.\d+)?(?:ms|s)$/);
    },
  );

  it('--ease-* tokens still exist as easing functions', () => {
    const stripped = stripComments(GLOBAL_CSS);
    for (const name of ['--ease-smooth', '--ease-spring', '--ease-spring-out', '--ease-spring-in']) {
      expect(
        stripped.includes(`${name}:`),
        `${name} must remain declared so transitions can pair duration + easing tokens`,
      ).toBe(true);
    }
  });

  it('--dur-spring is at least 400ms so sheet/modal motion reads as deliberate', () => {
    // Sheets, modals, and the sidebar collapse all use --dur-spring.
    // Earlier values (320ms) felt too quick — 480ms is the floor.
    const stripped = stripComments(GLOBAL_CSS);
    const match = stripped.match(/--dur-spring\s*:\s*(\d+)(?:\.\d+)?(ms|s)/);
    expect(match, '--dur-spring must be declared with a numeric duration').not.toBeNull();
    const value = Number(match![1]);
    const unit = match![2];
    const ms = unit === 's' ? value * 1000 : value;
    expect(ms, '--dur-spring must be at least 400ms — the slide-in should feel deliberate').toBeGreaterThanOrEqual(400);
  });
});