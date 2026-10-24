import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PythonCheckResult } from '../src/state/types';
import type { PythonOutputLine } from '../src/python/pythonSession';

const mocks = vi.hoisted(() => ({
  appendPythonLines: vi.fn(),
  setPythonInterpreter: vi.fn(),
  saveTab: vi.fn(),
  check: vi.fn(),
}));

vi.mock('../src/platform', () => ({
  platform: {
    python: {
      check: mocks.check,
    },
  },
}));

vi.mock('../src/state/documents', () => ({
  saveTab: mocks.saveTab,
}));

vi.mock('../src/python/pythonSession', () => ({
  appendPythonLines: mocks.appendPythonLines,
  setPythonInterpreter: mocks.setPythonInterpreter,
}));

async function setup() {
  vi.resetModules();
  const { appStore } = await import('../src/state/store');
  const actions = await import('../src/python/checkPython');
  return { appStore, ...actions };
}

function openTab(
  appStore: Awaited<ReturnType<typeof setup>>['appStore'],
  options: { id?: string; relPath?: string; dirty?: boolean } = {},
): void {
  const id = options.id ?? 'tab-1';
  const relPath = options.relPath ?? 'reports/inventory_report.py';
  appStore.dispatch({
    type: 'tabs/open',
    tab: { id, relPath, name: relPath.split('/').pop() ?? relPath },
  });
  if (options.dirty ?? false) {
    appStore.dispatch({ type: 'tabs/dirty', id, dirty: true });
  }
}

beforeEach(() => {
  mocks.appendPythonLines.mockReset();
  mocks.setPythonInterpreter.mockReset();
  mocks.saveTab.mockReset();
  mocks.saveTab.mockResolvedValue(true);
  mocks.check.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('checkActivePython', () => {
  it('reports the line count of a valid file as the AC-09 success line', async () => {
    mocks.check.mockResolvedValue({ ok: true, lineCount: 40 } satisfies PythonCheckResult);

    const { appStore, checkActivePython } = await setup();
    openTab(appStore);

    await checkActivePython();

    expect(mocks.check).toHaveBeenCalledWith('reports/inventory_report.py');
    expect(mocks.appendPythonLines).toHaveBeenCalledWith([
      { stream: 'meta', text: 'No syntax errors (40 lines)', loc: null },
      {
        stream: 'meta',
        text: 'Checked reports/inventory_report.py · line count 40 · 0 errors',
        loc: null,
      },
      {
        stream: 'meta',
        text: 'No files were executed and no __pycache__ or .pyc artefacts were written.',
        loc: null,
      },
    ]);
    expect(mocks.setPythonInterpreter).not.toHaveBeenCalled();
  });

  it('names the line, the column and the offending source line of a syntax error', async () => {
    mocks.check.mockResolvedValue({
      ok: false,
      kind: 'syntax',
      line: 4,
      column: 17,
      sourceText: 'import csv, math,',
      message: 'invalid syntax',
    } satisfies PythonCheckResult);

    const { appStore, checkActivePython } = await setup();
    openTab(appStore);

    await checkActivePython();

    const [line] = mocks.appendPythonLines.mock.calls[0] as [Omit<PythonOutputLine, 'id'>[]];
    expect(line).toEqual([
      {
        stream: 'stderr',
        text: 'reports/inventory_report.py, line 4, column 17: invalid syntax',
        loc: { relPath: 'reports/inventory_report.py', line: 4, column: 17 },
      },
      { stream: 'stderr', text: '    4 | import csv, math,', loc: null },
      { stream: 'stderr', text: '      |                 ^', loc: null },
      {
        stream: 'meta',
        text: 'No syntax errors found before line 4. The file was not executed.',
        loc: null,
      },
    ]);
  });

  it('reports a missing interpreter as a plain notice and records it in the session', async () => {
    mocks.check.mockResolvedValue({
      ok: false,
      kind: 'interpreter-missing',
    } satisfies PythonCheckResult);

    const { appStore, checkActivePython } = await setup();
    openTab(appStore);

    await checkActivePython();

    expect(mocks.setPythonInterpreter).toHaveBeenCalledWith({ found: false });
    expect(mocks.appendPythonLines).toHaveBeenCalledWith([
      {
        stream: 'notice',
        text:
          'Python was not found on this system. Install Python 3 and make sure it is on your PATH.',
        loc: null,
      },
    ]);
  });

  it('reports a rejected check as its plain message', async () => {
    mocks.check.mockResolvedValue({
      ok: false,
      kind: 'rejected',
      message: 'No workspace folder is open.',
    } satisfies PythonCheckResult);

    const { appStore, checkActivePython } = await setup();
    openTab(appStore);

    await checkActivePython();

    expect(mocks.appendPythonLines).toHaveBeenCalledWith([
      { stream: 'stderr', text: 'No workspace folder is open.', loc: null },
    ]);
  });

  it('saves a dirty active tab before asking the platform to check it', async () => {
    const order: string[] = [];
    mocks.saveTab.mockImplementation(async (id: string) => {
      order.push(`save:${id}`);
      return true;
    });
    mocks.check.mockImplementation(async (relPath: string) => {
      order.push(`check:${relPath}`);
      return { ok: true, lineCount: 3 };
    });

    const { appStore, checkActivePython } = await setup();
    openTab(appStore, { dirty: true });

    await checkActivePython();

    expect(order).toEqual(['save:tab-1', 'check:reports/inventory_report.py']);
  });

  it('does not check a clean tab and stops when the save fails', async () => {
    mocks.check.mockResolvedValue({ ok: true, lineCount: 3 });

    const first = await setup();
    openTab(first.appStore);
    await first.checkActivePython();

    expect(mocks.saveTab).not.toHaveBeenCalled();
    expect(mocks.check).toHaveBeenCalledTimes(1);

    const second = await setup();
    openTab(second.appStore, { dirty: true });
    mocks.saveTab.mockResolvedValue(false);
    mocks.check.mockClear();

    await second.checkActivePython();

    expect(mocks.saveTab).toHaveBeenCalledWith('tab-1');
    expect(mocks.check).not.toHaveBeenCalled();
  });

  it('ignores a non-Python active tab', async () => {
    const { appStore, checkActivePython } = await setup();
    openTab(appStore, { relPath: 'src/documents.ts' });

    await checkActivePython();

    expect(mocks.saveTab).not.toHaveBeenCalled();
    expect(mocks.check).not.toHaveBeenCalled();
    expect(mocks.appendPythonLines).not.toHaveBeenCalled();
  });

  it('registers the Python: Check syntax command with Ctrl+Shift+B', async () => {
    await setup();
    const { getCommands } = await import('../src/commands/registry');

    const command = getCommands().find((candidate) => candidate.id === 'python.check');

    expect(command?.title).toBe('Python: Check syntax');
    expect(command?.keybinding).toBe('Ctrl+Shift+B');
  });
});

describe('pythonCheckOutcome', () => {
  function line(
    stream: PythonOutputLine['stream'],
    text: string,
    loc: PythonOutputLine['loc'] = null,
  ): PythonOutputLine {
    return { id: 1, stream, text, loc };
  }

  it('recognises a passed check from its success line', async () => {
    const { pythonCheckOutcome } = await setup();

    expect(pythonCheckOutcome([line('meta', 'No syntax errors (40 lines)')])).toBe('passed');
  });

  it('recognises a syntax error from its located message line', async () => {
    const { pythonCheckOutcome } = await setup();

    expect(
      pythonCheckOutcome([
        line('stderr', 'reports/inventory_report.py, line 4, column 17: invalid syntax', {
          relPath: 'reports/inventory_report.py',
          line: 4,
          column: 17,
        }),
      ]),
    ).toBe('syntax-error');
  });

  it('reports no check outcome for run output', async () => {
    const { pythonCheckOutcome } = await setup();

    expect(
      pythonCheckOutcome([line('stderr', 'Traceback (most recent call last):')]),
    ).toBeNull();
  });

  it('attributes an outcome only to the file that was checked', async () => {
    const { pythonCheckOutcome } = await setup();
    const passed = [
      line('meta', 'No syntax errors (40 lines)'),
      line('meta', 'Checked reports/inventory_report.py · line count 40 · 0 errors'),
    ];

    expect(pythonCheckOutcome(passed, 'reports/inventory_report.py')).toBe('passed');
    expect(pythonCheckOutcome(passed, 'reports/receipts.py')).toBeNull();

    const failed = [
      line('stderr', 'reports/inventory_report.py, line 4, column 17: invalid syntax', {
        relPath: 'reports/inventory_report.py',
        line: 4,
        column: 17,
      }),
    ];

    expect(pythonCheckOutcome(failed, 'reports/receipts.py')).toBeNull();
  });
});
