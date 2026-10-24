// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import App from '../src/App';
import { installKeymap } from '../src/commands/keymap';
import { appStore } from '../src/state/store';
import { Palette } from '../src/ui/Palette';

let uninstallKeymap: () => void = () => undefined;

beforeEach(() => {
  appStore.dispatch({ type: 'view/showSearch' });
  uninstallKeymap = installKeymap();
});

afterEach(() => {
  uninstallKeymap();
  cleanup();
});

function openPalette(): void {
  fireEvent.keyDown(window, { key: 'P', ctrlKey: true, shiftKey: true });
}

describe('palette footer', () => {
  it('shows one status text and one hint row in the command palette', async () => {
    const { container } = render(<App />);
    openPalette();

    await screen.findByTestId('command-palette');
    const footer = container.querySelector('.palette-footer');
    expect(footer).not.toBeNull();

    const status = await within(footer as HTMLElement).findAllByText(/available commands/);
    expect(status).toHaveLength(1);

    expect(footer!.querySelectorAll('.palette-hints')).toHaveLength(1);
    expect(footer!.querySelectorAll('.palette-hint')).toHaveLength(3);

    for (const keys of ['↑↓', 'Enter', 'Esc']) {
      expect(within(footer as HTMLElement).getAllByText(keys)).toHaveLength(1);
    }

    const hints = footer!.querySelector('.palette-hints') as HTMLElement;
    expect(hints.textContent).toBe('↑↓NavigateEnterRunEscClose');
  });

  it('keeps the shared shell to a single default hint row when a caller passes only a footer', async () => {
    const { container } = render(
      <Palette label="Quick open" groups={[]} footer={<span>Fuzzy match across the workspace</span>} onClose={() => undefined} />,
    );

    const footer = container.querySelector('.palette-footer');
    expect(footer).not.toBeNull();

    await waitFor(() => expect(footer!.querySelectorAll('.palette-hint')).toHaveLength(3));
    expect(footer!.querySelectorAll('.palette-hints')).toHaveLength(1);
    expect(within(footer as HTMLElement).getAllByText('Fuzzy match across the workspace')).toHaveLength(1);
  });
});
