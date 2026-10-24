// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import App from '../src/App';
import { installKeymap } from '../src/commands/keymap';
import { getCommands, registerCommands } from '../src/commands/registry';
import { appStore } from '../src/state/store';

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

describe('command palette', () => {
  it('opens on Ctrl+Shift+P with every registered command and its keybinding', async () => {
    render(<App />);
    openPalette();

    const palette = await screen.findByTestId('command-palette');

    for (const command of getCommands()) {
      expect(within(palette).getByText(command.title)).toBeTruthy();
    }

    const explorer = screen.getByRole('option', { name: /View: Explorer/ });
    expect(explorer.textContent).toContain('Ctrl+Shift+E');
  });

  it('filters the list fuzzily and runs the marked command with Enter', async () => {
    render(<App />);
    openPalette();

    await screen.findByTestId('command-palette');
    const input = screen.getByPlaceholderText('Type a command');

    fireEvent.change(input, { target: { value: 'explor' } });
    expect(screen.getAllByRole('option')).toHaveLength(1);

    fireEvent.change(input, { target: { value: 'xyzzy' } });
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(screen.getByText('No command matches that query.')).toBeTruthy();

    fireEvent.change(input, { target: { value: 'explorer' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(screen.getByTestId('view-explorer')).toBeTruthy());
    expect(screen.queryByTestId('command-palette')).toBeNull();
  });

  it('moves the marked command with the arrow keys', async () => {
    render(<App />);
    openPalette();

    await screen.findByTestId('command-palette');
    const input = screen.getByPlaceholderText('Type a command');
    const options = screen.getAllByRole('option');

    expect(options[0].getAttribute('aria-selected')).toBe('true');

    fireEvent.keyDown(input, { key: 'ArrowDown' });

    await waitFor(() => {
      const moved = screen.getAllByRole('option');
      expect(moved[0].getAttribute('aria-selected')).toBe('false');
      expect(moved[1].getAttribute('aria-selected')).toBe('true');
    });
  });

  it('closes on Escape without running anything', async () => {
    render(<App />);
    openPalette();

    await screen.findByTestId('command-palette');
    fireEvent.keyDown(screen.getByPlaceholderText('Type a command'), { key: 'Escape' });

    await waitFor(() => expect(screen.queryByTestId('command-palette')).toBeNull());
    expect(screen.getByTestId('view-search')).toBeTruthy();
  });

  it('closes on a click outside without running anything', async () => {
    const { container } = render(<App />);
    openPalette();

    await screen.findByTestId('command-palette');
    const scrim = container.querySelector('.scrim');
    expect(scrim).toBeTruthy();

    fireEvent.mouseDown(scrim as Element);

    await waitFor(() => expect(screen.queryByTestId('command-palette')).toBeNull());
    expect(screen.getByTestId('view-search')).toBeTruthy();
  });

  it('reads the registry when it opens, so late commands appear', async () => {
    render(<App />);

    registerCommands([
      {
        id: 'test.lateCommand',
        title: 'Test: Late Command',
        keybinding: 'Ctrl+Alt+L',
        run: () => true,
      },
    ]);

    openPalette();
    await screen.findByTestId('command-palette');

    const late = screen.getByRole('option', { name: /Test: Late Command/ });
    expect(late.textContent).toContain('Ctrl+Alt+L');

    fireEvent.change(screen.getByPlaceholderText('Type a command'), { target: { value: 'late' } });
    expect(screen.getAllByRole('option')).toHaveLength(1);
  });
});
