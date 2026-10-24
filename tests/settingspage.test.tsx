// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import App from '../src/App';
import { DEFAULT_SETTINGS, appStore } from '../src/state/store';

function openSettings(): void {
  fireEvent.click(screen.getByTestId('activity-settings'));
}

function settingsCss(): string {
  return readFileSync(resolve(__dirname, '../src/views/settings.css'), 'utf8');
}

function cssRule(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, 'm').exec(css);
  return match ? match[1] : '';
}

beforeEach(() => {
  appStore.dispatch({ type: 'settings/replace', settings: { ...DEFAULT_SETTINGS } });
  appStore.dispatch({ type: 'view/showExplorer' });
});

afterEach(() => {
  cleanup();
});

describe('settings page scroll container', () => {
  it('renders the page as the scroll container of the editor region', async () => {
    render(<App />);
    openSettings();

    await waitFor(() => {
      expect(screen.getByTestId('view-settings')).toBeTruthy();
    });

    const wrap = screen.getByTestId('view-settings');
    const editorRegion = screen.getByTestId('editor-pane');
    const page = wrap.querySelector(':scope > .settings-page');

    expect(wrap.className).toContain('settings-wrap');
    expect(editorRegion.lastElementChild).toBe(wrap);
    expect(page).toBeTruthy();
    expect(page?.lastElementChild?.getAttribute('aria-labelledby')).toBe('storage-title');
  });

  it('declares the scroll container and the closure below the last row in its own stylesheet', () => {
    const css = settingsCss();

    const container = cssRule(css, '.editor-region > .settings-wrap');
    expect(container).toContain('overflow: auto');
    expect(container).toContain('min-height: 0');

    const page = cssRule(css, '.settings-wrap > .settings-page');
    expect(page).toContain('70px');
  });
});

describe('settings page controls', () => {
  it('keeps every preference operable and applies a change immediately', async () => {
    render(<App />);
    openSettings();

    await waitFor(() => {
      expect(screen.getByTestId('view-settings')).toBeTruthy();
    });

    for (const testId of [
      'setting-theme-dark',
      'setting-theme-light',
      'setting-font-size',
      'setting-tree-font-size',
      'setting-tab-size-2',
      'setting-tab-size-4',
      'setting-tab-size-8',
      'setting-word-wrap',
      'setting-show-whitespace',
    ]) {
      const host = screen.getByTestId(testId);
      const control = (
        host instanceof HTMLInputElement ? host : host.querySelector('input')
      ) as HTMLInputElement | null;
      expect(control).toBeTruthy();
      expect(control?.disabled).toBe(false);
    }

    fireEvent.click(screen.getByTestId('setting-theme-light'));
    fireEvent.click(screen.getByTestId('setting-tab-size-8'));
    fireEvent.click(screen.getByTestId('setting-word-wrap'));

    expect(appStore.getState().settings).toMatchObject({
      theme: 'light',
      tabSize: 8,
      wordWrap: !DEFAULT_SETTINGS.wordWrap,
    });
    expect((screen.getByTestId('setting-theme-light') as HTMLInputElement).checked).toBe(true);
  });

  it('keeps the editor font size inside the range the page promises', async () => {
    render(<App />);
    openSettings();

    await waitFor(() => {
      expect(screen.getByTestId('view-settings')).toBeTruthy();
    });

    const fontSize = screen.getByTestId('setting-font-size') as HTMLInputElement;
    const treeFontSize = screen.getByTestId('setting-tree-font-size') as HTMLInputElement;

    expect(fontSize.min).toBe('10');
    expect(fontSize.max).toBe('24');

    fireEvent.change(fontSize, { target: { value: '10' } });
    expect(appStore.getState().settings.fontSize).toBe(10);

    fireEvent.change(fontSize, { target: { value: '24' } });
    expect(appStore.getState().settings.fontSize).toBe(24);

    fireEvent.change(treeFontSize, { target: { value: '18' } });
    expect(appStore.getState().settings.treeFontSize).toBe(18);
  });
});
