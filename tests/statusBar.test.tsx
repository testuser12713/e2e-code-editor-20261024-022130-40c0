// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';

import { StatusBar } from '../src/shell/StatusBar';
import { DEFAULT_SETTINGS, appStore } from '../src/state/store';

function resetStore(): void {
  act(() => {
    appStore.dispatch({ type: 'tabs/restore', tabs: [] });
    appStore.dispatch({ type: 'workspace/close' });
    appStore.dispatch({ type: 'settings/replace', settings: { ...DEFAULT_SETTINGS } });
    appStore.dispatch({ type: 'status/reset' });
  });
}

function openStatus(overrides: Partial<ReturnType<typeof appStore.getState>['status']> = {}): void {
  act(() => {
    appStore.dispatch({
      type: 'status/update',
      status: {
        relPath: 'src/app.ts',
        language: 'TypeScript',
        line: 12,
        column: 7,
        indentMode: 'spaces',
        indentSize: 2,
        eol: 'lf',
        encoding: 'utf-8',
        ...overrides,
      },
    });
  });
}

beforeEach(() => {
  resetStore();
});

afterEach(() => {
  cleanup();
});

describe('status bar', () => {
  it('renders the active document status slice', () => {
    openStatus({ language: 'Python', indentSize: 4, eol: 'crlf' });

    render(<StatusBar />);

    expect(screen.getByTestId('status-language').textContent).toBe('Python');
    expect(screen.getByTestId('status-indentation').textContent).toBe('Spaces: 4');
    expect(screen.getByText('12:7')).toBeTruthy();
    expect(screen.getByText('CRLF')).toBeTruthy();
    expect(screen.getByText('UTF-8')).toBeTruthy();
  });

  it('follows cursor movement immediately', () => {
    openStatus();

    render(<StatusBar />);
    expect(screen.getByText('12:7')).toBeTruthy();

    act(() => {
      appStore.dispatch({ type: 'status/update', status: { line: 42, column: 3 } });
    });

    expect(screen.getByText('42:3')).toBeTruthy();
    expect(screen.queryByText('12:7')).toBeNull();
  });

  it('shows tabs when the document uses tabs', () => {
    openStatus({ indentMode: 'tabs' });

    render(<StatusBar />);

    expect(screen.getByTestId('status-indentation').textContent).toBe('Tabs');
  });

  it('switches the active document language from the language menu', () => {
    act(() => {
      appStore.dispatch({
        type: 'tabs/open',
        tab: { id: 'tab-1', relPath: 'src/app.ts', name: 'app.ts' },
      });
    });
    openStatus();

    render(<StatusBar />);

    fireEvent.click(screen.getByTestId('status-language'));

    const menu = screen.getByTestId('status-language-menu');
    expect(menu.hidden).toBe(false);
    for (const language of [
      'TypeScript',
      'JavaScript',
      'JSON',
      'HTML',
      'CSS',
      'SCSS',
      'Python',
      'Markdown',
      'Shell',
      'YAML',
      'XML',
      'Plain Text',
    ]) {
      expect(within(menu).getByText(language)).toBeTruthy();
    }

    fireEvent.click(screen.getByTestId('status-language-option-python'));

    expect(appStore.getState().status.language).toBe('Python');
    expect(screen.getByTestId('status-language').textContent).toBe('Python');
  });

  it('dispatches the settings action together with the status when indentation changes', () => {
    openStatus();
    render(<StatusBar />);

    const dispatchSpy = vi.spyOn(appStore, 'dispatch');

    fireEvent.click(screen.getByTestId('status-indentation'));
    fireEvent.click(screen.getByTestId('status-indent-option-spaces-4'));

    expect(dispatchSpy).toHaveBeenCalledWith({ type: 'settings/update', patch: { tabSize: 4 } });
    expect(appStore.getState().status.indentSize).toBe(4);
    expect(screen.getByTestId('status-indentation').textContent).toBe('Spaces: 4');
  });

  it('is visibly idle without an active document', () => {
    render(<StatusBar />);

    const bar = screen.getByTestId('status-bar');
    expect(within(bar).getByText('No active document')).toBeTruthy();
    expect(within(bar).queryAllByRole('button')).toHaveLength(0);
    expect(screen.queryByTestId('status-language')).toBeNull();
    expect(screen.queryByTestId('status-indentation')).toBeNull();
  });
});
