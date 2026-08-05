import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SettingsProvider } from '../../../hooks/useSettings';
import ShortcutTile from './ShortcutTile';

function renderTile(props: Partial<React.ComponentProps<typeof ShortcutTile>> = {}) {
  return render(
    <SettingsProvider>
      <ShortcutTile
        shortcut={{
          id: 'shortcut-1',
          title: 'Example',
          url: 'https://example.com',
          favicon: 'https://example.com/favicon.png',
          group: 'Tools',
          order: 0,
        }}
        index={0}
        existingGroups={['Tools', 'Work']}
        onDelete={vi.fn()}
        onUpdate={vi.fn()}
        {...props}
      />
    </SettingsProvider>,
  );
}

describe('ShortcutTile editor', () => {
  it('keeps the shortcut tile mounted while the editor is open', () => {
    renderTile();
    const tile = screen.getByText('Example').closest<HTMLElement>('[tabindex="0"]')!;
    const tileIcon = tile.querySelector('img');

    fireEvent.contextMenu(tile, { clientX: 100, clientY: 100 });
    fireEvent.click(screen.getByText(/Edit group/i));

    expect(screen.getByRole('dialog', { name: /Edit group/i })).toBeInTheDocument();
    expect(tile).toBeInTheDocument();
    expect(tileIcon).toBeInTheDocument();
  });

  it('closes the editor when clicking outside it', () => {
    renderTile();
    const tile = screen.getByText('Example').closest<HTMLElement>('[tabindex="0"]')!;

    fireEvent.contextMenu(tile, { clientX: 100, clientY: 100 });
    fireEvent.click(screen.getByText(/Edit group/i));
    expect(screen.getByRole('dialog', { name: /Edit group/i })).toBeInTheDocument();

    fireEvent.mouseDown(document.body);

    expect(screen.queryByRole('dialog', { name: /Edit group/i })).not.toBeInTheDocument();
  });
});

describe('ShortcutTile favicon cache', () => {
  it('persists the fallback URL after it loads successfully', () => {
    const onUpdate = vi.fn();
    renderTile({ onUpdate });
    const tile = screen.getByText('Example').closest<HTMLElement>('[tabindex="0"]')!;
    const icon = tile.querySelector('img')!;

    fireEvent.error(icon);
    fireEvent.error(icon);
    fireEvent.load(icon);

    expect(onUpdate).toHaveBeenCalledWith('shortcut-1', {
      favicon: 'https://www.google.com/s2/favicons?domain=example.com&sz=64',
    });
  });
});

describe('ShortcutTile group dropdown', () => {
  it('opens a popover listing all existing groups when the chevron is clicked', () => {
    renderTile();
    const tile = screen.getByText('Example').closest<HTMLElement>('[tabindex="0"]')!;

    // Open the right-click context menu, then click the "Edit group" item.
    fireEvent.contextMenu(tile, { clientX: 100, clientY: 100 });
    fireEvent.click(screen.getByText(/Edit group/i));

    // The popover's listbox isn't visible until we click the chevron. The
    // chevron button is the only button in the dialog with aria-haspopup.
    const dialog = screen.getByRole('dialog', { name: /Edit group/i });
    const chevron = within(dialog).getByRole('button', { name: /Open group list/i });
    fireEvent.click(chevron);

    // The listbox must surface every existing group — including the
    // shortcut's current group, which the previous `<datalist>`
    // implementation filtered out (the bug that left users with only one
    // group staring at an empty dropdown).
    const listbox = screen.getByRole('listbox');
    expect(within(listbox).getByRole('option', { name: 'Tools' })).toBeInTheDocument();
    expect(within(listbox).getByRole('option', { name: 'Work' })).toBeInTheDocument();
  });

  it('lets the user pick a different group from the popover without closing the editor', () => {
    const onUpdate = vi.fn();
    renderTile({ onUpdate });
    const tile = screen.getByText('Example').closest<HTMLElement>('[tabindex="0"]')!;

    fireEvent.contextMenu(tile, { clientX: 100, clientY: 100 });
    fireEvent.click(screen.getByText(/Edit group/i));

    const dialog = screen.getByRole('dialog', { name: /Edit group/i });
    const chevron = within(dialog).getByRole('button', { name: /Open group list/i });
    fireEvent.click(chevron);

    // Pick the "Work" group from the popover. This is the gesture the bug
    // report calls out: previously the host's document mousedown handler
    // closed the editor before this option's click could register.
    fireEvent.click(screen.getByRole('option', { name: 'Work' }));

    // Editor must still be open…
    expect(screen.getByRole('dialog', { name: /Edit group/i })).toBeInTheDocument();
    // …and the input must now reflect the picked group. The dropdown's
    // text input is the only input inside the dialog whose accessible
    // name is *just* "Group (optional)" — the title/URL inputs above it
    // use different placeholders.
    const groupInput = within(dialog).getByPlaceholderText(/Group/i) as HTMLInputElement;
    expect(groupInput.value).toBe('Work');
    // We don't assert on onUpdate here — selection only updates local
    // state; the host persists on Save.
    expect(onUpdate).not.toHaveBeenCalled();
  });
});