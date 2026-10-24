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

function openWorkspace(root = '/projects/forge-editor'): void {
  act(() => {
    appStore.dispatch({ type: 'workspace/open', root });
  });
}

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

  it('keeps the document segments as neutral placeholders while a workspace has no active document', () => {
    openWorkspace();

    render(<StatusBar />);

    const bar = screen.getByTestId('status-bar');
    expect(within(bar).getByTestId('status-language').textContent).toBe('\u2014');
    expect(within(bar).getByTestId('status-position').textContent).toBe('\u2014:\u2014');
    expect(within(bar).getByTestId('status-indentation').textContent).toBe('\u2014');
    expect(within(bar).getByTestId('status-eol').textContent).toBe('\u2014');
    expect(within(bar).getByTestId('status-encoding').textContent).toBe('\u2014');
    expect(within(bar).getByText('forge-editor')).toBeTruthy();

    expect(within(bar).queryByText('Welcome')).toBeNull();
    expect(within(bar).queryByText('No active document')).toBeNull();
    expect(within(bar).queryAllByRole('button')).toHaveLength(0);
  });

  it('fills the placeholder segments and follows the cursor once a document opens', () => {
    openWorkspace();

    render(<StatusBar />);
    expect(screen.getByTestId('status-position').textContent).toBe('\u2014:\u2014');

    act(() => {
      appStore.dispatch({
        type: 'status/update',
        status: {
          relPath: 'src/app.ts',
          language: 'TypeScript',
          line: 37,
          column: 18,
          indentMode: 'spaces',
          indentSize: 2,
          eol: 'lf',
          encoding: 'utf-8',
        },
      });
    });

    expect(screen.getByTestId('status-language').textContent).toBe('TypeScript');
    expect(screen.getByTestId('status-position').textContent).toBe('37:18');
    expect(screen.getByTestId('status-indentation').textContent).toBe('Spaces: 2');
    expect(screen.getByTestId('status-eol').textContent).toBe('LF');
    expect(screen.getByTestId('status-encoding').textContent).toBe('UTF-8');

    act(() => {
      appStore.dispatch({ type: 'status/update', status: { line: 4, column: 3 } });
    });

    expect(screen.getByTestId('status-position').textContent).toBe('4:3');
  });
});
