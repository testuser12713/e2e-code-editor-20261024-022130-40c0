// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import type { PlatformApi } from '../src/state/types';

const environment = vi.hoisted(() => ({
  bridge: true,
  platform: {
    python: {
      run: vi.fn(),
      stop: vi.fn(),
      check: vi.fn(),
      interpreter: vi.fn(),
      onEvent: vi.fn(() => () => undefined),
    },
    files: {
      read: vi.fn(),
      write: vi.fn(),
    },
  },
}));

vi.mock('../src/platform', () => ({
  platform: environment.platform as unknown as PlatformApi,
  get hasDesktopBridge() {
    return environment.bridge;
  },
}));

import { PythonPanel } from '../src/shell/PythonPanel';
import {
  appendPythonLines,
  clearPythonOutput,
  setPythonInterpreter,
  setPythonRun,
} from '../src/python/pythonSession';
import { registerEditorApi } from '../src/state/documents';
import { appStore } from '../src/state/store';

const editor = {
  getValue: () => '',
  getPosition: () => ({ line: 1, column: 1 }),
  setPosition: vi.fn(),
  focus: vi.fn(),
  setLanguage: vi.fn(),
};

function resetStore(): void {
  act(() => {
    appStore.dispatch({ type: 'tabs/restore', tabs: [] });
    appStore.dispatch({ type: 'workspace/close' });
    clearPythonOutput();
    setPythonRun({ state: 'idle' });
    setPythonInterpreter(null);
  });
}

function openWorkspace(root = '/projects/forge-editor'): void {
  act(() => {
    appStore.dispatch({ type: 'workspace/open', root });
  });
}

function openTab(relPath: string, name: string, id = 'tab-1'): void {
  act(() => {
    appStore.dispatch({ type: 'tabs/open', tab: { id, relPath, name } });
  });
}

beforeEach(() => {
  environment.bridge = true;
  environment.platform.files.read.mockReset();
  environment.platform.files.read.mockResolvedValue({
    ok: true,
    content: 'print("hello")\n',
    eol: 'lf',
    encoding: 'utf-8',
    language: 'Python',
  });
  editor.setPosition.mockReset();
  editor.focus.mockReset();
  registerEditorApi(editor);
  resetStore();
});

afterEach(() => {
  cleanup();
});

describe('python output panel', () => {
  it('shows the active Python file, an idle badge and usable run and clear controls', () => {
    openWorkspace();
    openTab('reports/inventory_report.py', 'inventory_report.py');
    setPythonInterpreter({ found: true, path: 'python3', version: '3.12.4' });

    render(<PythonPanel />);

    const drawRun = screen.getByTestId('python-run') as HTMLButtonElement;
    expect(screen.getByRole('region', { name: 'Python output' })).toBe(
      screen.getByTestId('python-panel'),
    );
    expect(screen.getByText('inventory_report.py')).toBeTruthy();
    expect(screen.getByText('Python 3.12.4')).toBeTruthy();
    expect(screen.getByText('idle')).toBeTruthy();
    expect(drawRun.disabled).toBe(false);
    expect((screen.getByTestId('python-clear') as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByTestId('python-stop')).toBeNull();
    expect(screen.getByText('Output is empty')).toBeTruthy();
    expect(screen.getByText('Working directory: /projects/forge-editor')).toBeTruthy();
    expect(screen.getByTestId('python-check')).toBeTruthy();
  });

  it('disables run and check and explains why on a non-Python tab', () => {
    openWorkspace();
    openTab('src/documents.ts', 'documents.ts');

    render(<PythonPanel />);

    expect(screen.getByText('documents.ts')).toBeTruthy();
    expect(screen.getByText('Python unavailable for this tab')).toBeTruthy();
    expect(screen.getByText('unavailable')).toBeTruthy();
    expect((screen.getByTestId('python-run') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTestId('python-check') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTestId('python-run') as HTMLButtonElement).title).toBe(
      'Only Python files can be run',
    );
    expect(screen.getByText(/Only Python files can be run\./)).toBeTruthy();
    expect((screen.getByTestId('python-clear') as HTMLButtonElement).disabled).toBe(false);
  });

  it('keeps the panel visible in the browser bridge and names the desktop requirement', () => {
    environment.bridge = false;
    openWorkspace();
    openTab('reports/inventory_report.py', 'inventory_report.py');

    render(<PythonPanel />);

    expect((screen.getByTestId('python-run') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTestId('python-check') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('Desktop feature')).toBeTruthy();
    expect(screen.getByText('unavailable')).toBeTruthy();
    expect(screen.getByText(/Running Python requires the desktop application\./)).toBeTruthy();
    expect(
      screen.getByText(/The output panel is shown for consistency; no child process is started here\./),
    ).toBeTruthy();
    expect(screen.queryByTestId('python-stop')).toBeNull();
  });

  it('renders streamed output as text and keeps Clear from stopping the run', () => {
    openWorkspace();
    openTab('reports/inventory_report.py', 'inventory_report.py');

    act(() => {
      appendPythonLines([
        { stream: 'stdout', text: '<img src=x onerror=alert(1)>', loc: null },
        { stream: 'stderr', text: 'Traceback (most recent call last):', loc: null },
      ]);
      setPythonRun({ state: 'running', relPath: 'reports/inventory_report.py' });
    });

    render(<PythonPanel />);

    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeTruthy();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByText('Traceback (most recent call last):').closest('.py-line')?.getAttribute('data-stream')).toBe('stderr');
    expect(screen.getByText('running')).toBeTruthy();
    expect((screen.getByTestId('python-run') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId('python-stop').textContent).toContain('Stop');

    fireEvent.click(screen.getByTestId('python-clear'));

    expect(screen.queryByText('<img src=x onerror=alert(1)>')).toBeNull();
    expect(screen.getByTestId('python-stop')).toBeTruthy();
  });

  it('opens the referenced file only from a line that carries a workspace location', async () => {
    openWorkspace();
    openTab('reports/inventory_report.py', 'inventory_report.py');

    act(() => {
      appendPythonLines([
        { stream: 'stdout', text: 'plain output without a location', loc: null },
        {
          stream: 'stderr',
          text: 'File "reports/inventory_report.py", line 7, in main',
          loc: { relPath: 'reports/inventory_report.py', line: 7, column: null },
        },
      ]);
      setPythonRun({ state: 'finished', relPath: 'reports/inventory_report.py', code: 1, reason: 'exit' });
    });

    render(<PythonPanel />);

    const plain = screen.getByText('plain output without a location');
    expect(plain.closest('button')).toBeNull();

    const jump = screen.getByRole('button', {
      name: 'File "reports/inventory_report.py", line 7, in main',
    });
    fireEvent.click(jump);

    await waitFor(() => {
      expect(editor.setPosition).toHaveBeenCalledWith({ line: 7, column: 1 });
    });
    expect(editor.focus).toHaveBeenCalled();
  });
});
