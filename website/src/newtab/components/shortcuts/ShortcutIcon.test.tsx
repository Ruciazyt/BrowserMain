import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ShortcutIcon } from './ShortcutIcon';

describe('ShortcutIcon', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('moves to the next unique source when a favicon request is slow', () => {
    vi.useFakeTimers();
    const { container } = render(
      <ShortcutIcon
        url="https://example.com/page"
        favicon="https://example.com/favicon.ico"
        title="Example"
      />,
    );
    const image = container.querySelector('img')!;

    expect(image).toHaveAttribute('src', 'https://example.com/favicon.ico');

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(image).toHaveAttribute(
      'src',
      'https://www.google.com/s2/favicons?domain=example.com&sz=64',
    );
  });
});