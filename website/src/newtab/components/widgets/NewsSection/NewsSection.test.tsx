import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsProvider } from '../../../hooks/useSettings';
import { FEEDS_KEY } from '../../../utils/rssFeeds';
import NewsSection from './NewsSection';

vi.mock('sortablejs', () => ({
  default: {
    create: vi.fn(() => ({ destroy: vi.fn() })),
  },
}));

describe('NewsSection', () => {
  beforeEach(async () => {
    Object.assign(chrome.storage, {
      onChanged: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
    });

    await chrome.storage.local.set({
      [FEEDS_KEY]: [{ id: 'feed-1', name: 'Test feed', url: 'https://example.com/rss', enabled: true }],
    });

    const items = Array.from({ length: 6 }, (_, index) => `
      <item>
        <title>Article ${index + 1}</title>
        <link>https://example.com/${index + 1}</link>
      </item>
    `).join('');

    // Cast to the Promise-returning overload — TypeScript can't pick
    // between the callback and Promise overloads of runtime.sendMessage
    // when passed through `vi.mocked`, so it resolves to the `void`
    // overload and `mockResolvedValue` rejects any non-void argument.
    vi.mocked(chrome.runtime.sendMessage as (msg: any) => Promise<any>).mockResolvedValue({
      success: true,
      xml: `<rss><channel>${items}</channel></rss>`,
    });
  });

  it('renders every item returned by a feed', async () => {
    render(
      <SettingsProvider>
        <NewsSection />
      </SettingsProvider>,
    );

    expect(await screen.findByText('Article 6')).toBeInTheDocument();
    expect(screen.getAllByText(/Article \d/)).toHaveLength(6);
  });
});