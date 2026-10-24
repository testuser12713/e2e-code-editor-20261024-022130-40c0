// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, screen, within } from '@testing-library/react';

import { StatusBar } from '../src/shell/StatusBar';
import {
  clearPythonOutput,
  setPythonInterpreter,
  setPythonRun,
} from '../src/python/pythonSession';
import { DEFAULT_SETTINGS, appStore } from '../src/state/store';

function resetStore(): void {
  act(() => {
    appStore.dispatch({ type: 'tabs/restore', tabs: [] });
    appStore.dispatch({ type: 'workspace/close' });
    appStore.dispatch({ type: 'settings/replace', settings: { ...DEFAULT_SETTINGS } });
    appStore.dispatch({ type: 'status/reset' });
    clearPythonOutput();
    setPythonRun({ state: 'idle' });
    setPythonInterpreter(null);
  });
}

function openStatus(): void {
  act(() => {
    appStore.dispatch({
      type: 'status/update',
      status: {
        relPath: 'scripts/inventory_report.py',
        language: 'Python',
        line: 34,
        column: 27,
        indentMode: 'spaces',
        indentSize: 4,
        eol: 'lf',
        encoding: 'utf-8',
      },
    });
  });
}

function openWorkspace(root = '/projects/forge-editor'): void {
  act(() => {
    appStore.dispatch({ type: 'workspace/open', root });
  });
}

beforeEach(() => {
  resetStore();
});

afterEach(() => {
  cleanup();
});

describe('python status item', () => {
  it('shows the running state with the file name', () => {
    openStatus();
    act(() => {
      setPythonRun({ state: 'running', relPath: 'scripts/inventory_report.py' });
    });

    render(<StatusBar />);

    const item = screen.getByTestId('status-python');
    expect(item.getAttribute('data-state')).toBe('running');
    expect(within(item).getByText('Python: running')).toBeTruthy();
    expect(within(item).getByText('inventory_report.py')).toBeTruthy();
  });

  it('shows the last exit code after a clean run', () => {
    openStatus();
    act(() => {
      setPythonRun({
        state: 'finished',
        relPath: 'scripts/inventory_report.py',
        code: 0,
        reason: 'exit',
      });
    });

    render(<StatusBar />);

    const item = screen.getByTestId('status-python');
    expect(item.getAttribute('data-state')).toBe('exit-0');
    expect(within(item).getByText('Python: exit 0')).toBeTruthy();
    expect(within(item).getByText('inventory_report.py')).toBeTruthy();
  });

  it('shows a non-zero exit code after a failing run', () => {
    openStatus();
    act(() => {
      setPythonRun({
        state: 'finished',
        relPath: 'scripts/inventory_report.py',
        code: 1,
        reason: 'exit',
      });
    });

    render(<StatusBar />);

    const item = screen.getByTestId('status-python');
    expect(item.getAttribute('data-state')).toBe('exit-n');
    expect(within(item).getByText('Python: exit 1')).toBeTruthy();
  });

  it('shows no Python item while no run is active', () => {
    openStatus();

    render(<StatusBar />);

    expect(screen.queryByTestId('status-python')).toBeNull();
  });

  it('returns to its normal state once the run is cleared', () => {
    openStatus();
    act(() => {
      setPythonRun({
        state: 'finished',
        relPath: 'scripts/inventory_report.py',
        code: 0,
        reason: 'exit',
      });
    });

    render(<StatusBar />);
    expect(screen.getByTestId('status-python')).toBeTruthy();

    act(() => {
      setPythonRun({ state: 'idle' });
    });

    expect(screen.queryByTestId('status-python')).toBeNull();
    expect(screen.getByTestId('status-language').textContent).toBe('Python');
  });

  it('reports a missing interpreter after a failed run', () => {
    openStatus();
    act(() => {
      setPythonInterpreter({ found: false });
      setPythonRun({
        state: 'finished',
        relPath: 'scripts/inventory_report.py',
        code: null,
        reason: 'exit',
      });
    });

    render(<StatusBar />);

    const item = screen.getByTestId('status-python');
    expect(item.getAttribute('data-state')).toBe('exit-n');
    expect(within(item).getByText('Python: not found')).toBeTruthy();
  });

  it('keeps the item in the workspace layout without an active document', () => {
    openWorkspace();
    act(() => {
      setPythonRun({ state: 'running', relPath: 'scripts/inventory_report.py' });
    });

    render(<StatusBar />);

    const bar = screen.getByTestId('status-bar');
    expect(within(bar).getByTestId('status-python')).toBeTruthy();
    expect(within(bar).getByText('Python: running')).toBeTruthy();
  });

  it('keeps the item in the welcome layout', () => {
    act(() => {
      setPythonRun({ state: 'running', relPath: 'scripts/inventory_report.py' });
    });

    render(<StatusBar />);

    const bar = screen.getByTestId('status-bar');
    expect(within(bar).getByTestId('status-python')).toBeTruthy();
    expect(within(bar).getByText('Python: running')).toBeTruthy();
  });
});
