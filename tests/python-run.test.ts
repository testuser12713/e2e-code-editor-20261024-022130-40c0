import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PythonEvent } from '../src/state/types';

const mocks = vi.hoisted(() => ({
  appendPythonLines: vi.fn(),
  clearPythonOutput: vi.fn(),
  setPythonInterpreter: vi.fn(),
  setPythonRun: vi.fn(),
  saveTab: vi.fn(),
  run: vi.fn(),
  stop: vi.fn(),
  onEvent: vi.fn(),
}));

vi.mock('../src/platform', () => ({
  platform: {
    python: {
      run: mocks.run,
      stop: mocks.stop,
      onEvent: mocks.onEvent,
    },
  },
}));

vi.mock('../src/state/documents', () => ({
  saveTab: mocks.saveTab,
}));

vi.mock('../src/python/pythonSession', () => ({
  appendPythonLines: mocks.appendPythonLines,
  clearPythonOutput: mocks.clearPythonOutput,
  setPythonInterpreter: mocks.setPythonInterpreter,
  setPythonRun: mocks.setPythonRun,
}));

let handler: ((event: PythonEvent) => void) | null = null;

async function setup() {
  vi.resetModules();
  const { appStore } = await import('../src/state/store');
  const actions = await import('../src/python/runPython');
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
  if (options.dirty ?? true) {
    appStore.dispatch({ type: 'tabs/dirty', id, dirty: true });
  }
}

beforeEach(() => {
  handler = null;
  mocks.appendPythonLines.mockReset();
  mocks.clearPythonOutput.mockReset();
  mocks.setPythonInterpreter.mockReset();
  mocks.setPythonRun.mockReset();
  mocks.saveTab.mockReset();
  mocks.saveTab.mockResolvedValue(true);
  mocks.run.mockReset();
  mocks.run.mockResolvedValue({ ok: true, runId: 'run-1' });
  mocks.stop.mockReset();
  mocks.stop.mockResolvedValue({ ok: true });
  mocks.onEvent.mockReset();
  mocks.onEvent.mockImplementation((callback: (event: PythonEvent) => void) => {
    handler = callback;
    return () => undefined;
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('runActivePython', () => {
  it('saves the dirty active tab before asking the platform to run it', async () => {
    const order: string[] = [];
    mocks.saveTab.mockImplementation(async (id: string) => {
      order.push(`save:${id}`);
      return true;
    });
    mocks.run.mockImplementation(async (relPath: string) => {
      order.push(`run:${relPath}`);
      return { ok: true, runId: 'run-1' };
    });

    const { appStore, runActivePython } = await setup();
    openTab(appStore);

    await runActivePython();

    expect(order).toEqual(['save:tab-1', 'run:reports/inventory_report.py']);
    expect(mocks.clearPythonOutput).toHaveBeenCalledTimes(1);
    expect(mocks.onEvent).toHaveBeenCalledTimes(1);
    expect(mocks.setPythonRun).toHaveBeenCalledWith({
      state: 'running',
      relPath: 'reports/inventory_report.py',
    });
  });

  it('does not save a clean tab and does not run when the save fails', async () => {
    const { appStore, runActivePython } = await setup();
    openTab(appStore, { dirty: false });

    await runActivePython();
    expect(mocks.saveTab).not.toHaveBeenCalled();
    expect(mocks.run).toHaveBeenCalledTimes(1);

    const second = await setup();
    openTab(second.appStore);
    mocks.saveTab.mockResolvedValue(false);
    mocks.run.mockClear();

    await second.runActivePython();

    expect(mocks.saveTab).toHaveBeenCalledWith('tab-1');
    expect(mocks.run).not.toHaveBeenCalled();
  });

  it('maps platform events into session lines and closing lines', async () => {
    const { appStore, runActivePython } = await setup();
    openTab(appStore);
    await runActivePython();

    expect(handler).not.toBeNull();
    const send = handler as (event: PythonEvent) => void;

    send({
      kind: 'started',
      runId: 'run-1',
      interpreter: { found: true, path: 'python3', version: '3.12.4' },
    });
    expect(mocks.setPythonInterpreter).toHaveBeenCalledWith({
      found: true,
      path: 'python3',
      version: '3.12.4',
    });
    expect(mocks.setPythonRun).toHaveBeenCalledWith({
      state: 'running',
      relPath: 'reports/inventory_report.py',
    });

    mocks.appendPythonLines.mockClear();
    send({ kind: 'output', runId: 'run-1', stream: 'stdout', text: 'hello', loc: null });
    expect(mocks.appendPythonLines).toHaveBeenLastCalledWith([
      { stream: 'stdout', text: 'hello', loc: null },
    ]);

    const loc = { relPath: 'reports/inventory_report.py', line: 7, column: 2 };
    send({ kind: 'output', runId: 'run-1', stream: 'stderr', text: 'File "x", line 7', loc });
    expect(mocks.appendPythonLines).toHaveBeenLastCalledWith([
      { stream: 'stderr', text: 'File "x", line 7', loc },
    ]);

    send({ kind: 'notice', runId: 'run-1', notice: 'stdin-eof' });
    expect(mocks.appendPythonLines).toHaveBeenLastCalledWith([
      { stream: 'notice', text: 'Standard input is not connected.', loc: null },
    ]);

    send({ kind: 'exit', runId: 'run-1', reason: 'exit', code: 0, durationMs: 420 });
    expect(mocks.appendPythonLines).toHaveBeenLastCalledWith([
      { stream: 'meta', text: 'Process exited with code 0 in 0.42 s', loc: null },
    ]);
    expect(mocks.setPythonRun).toHaveBeenLastCalledWith({
      state: 'finished',
      relPath: 'reports/inventory_report.py',
      code: 0,
      reason: 'exit',
    });
  });

  it.each([
    {
      name: 'a failing exit',
      event: { kind: 'exit', runId: 'run-1', reason: 'exit', code: 1, durationMs: 310 } as PythonEvent,
      expectedLine: { stream: 'stderr', text: 'Process exited with code 1 in 0.31 s', loc: null },
      expectedRun: {
        state: 'finished',
        relPath: 'reports/inventory_report.py',
        code: 1,
        reason: 'exit',
      },
    },
    {
      name: 'a user stop',
      event: { kind: 'exit', runId: 'run-1', reason: 'stopped', code: null, durationMs: 15 } as PythonEvent,
      expectedLine: { stream: 'meta', text: 'Process stopped by user', loc: null },
      expectedRun: {
        state: 'finished',
        relPath: 'reports/inventory_report.py',
        code: null,
        reason: 'stopped',
      },
    },
    {
      name: 'a timeout',
      event: { kind: 'exit', runId: 'run-1', reason: 'timeout', code: null, durationMs: 60000 } as PythonEvent,
      expectedLine: { stream: 'meta', text: 'Process stopped after 60 s', loc: null },
      expectedRun: {
        state: 'finished',
        relPath: 'reports/inventory_report.py',
        code: null,
        reason: 'timeout',
      },
    },
  ])('formats $name', async ({ event, expectedLine, expectedRun }) => {
    const { appStore, runActivePython } = await setup();
    openTab(appStore);
    await runActivePython();
    mocks.appendPythonLines.mockClear();

    (handler as (value: PythonEvent) => void)(event);

    expect(mocks.appendPythonLines).toHaveBeenCalledWith([expectedLine]);
    expect(mocks.setPythonRun).toHaveBeenCalledWith(expectedRun);
  });

  it('reports a missing interpreter without inventing an exit line', async () => {
    const { appStore, runActivePython } = await setup();
    openTab(appStore);
    await runActivePython();

    const send = handler as (event: PythonEvent) => void;
    send({
      kind: 'started',
      runId: 'run-1',
      interpreter: { found: false },
    });
    send({ kind: 'notice', runId: 'run-1', notice: 'interpreter-missing' });

    expect(mocks.setPythonInterpreter).toHaveBeenCalledWith({ found: false });
    expect(mocks.appendPythonLines).toHaveBeenCalledWith([
      {
        stream: 'notice',
        text:
          'Python was not found on this system. Install Python 3 and make sure it is on your PATH.',
        loc: null,
      },
      {
        stream: 'meta',
        text: 'No process was started. The editor and completion remain available.',
        loc: null,
      },
    ]);

    mocks.appendPythonLines.mockClear();
    send({ kind: 'exit', runId: 'run-1', reason: 'exit', code: null, durationMs: 0 });

    expect(mocks.appendPythonLines).not.toHaveBeenCalled();
    expect(mocks.setPythonRun).toHaveBeenLastCalledWith({
      state: 'finished',
      relPath: 'reports/inventory_report.py',
      code: null,
      reason: 'exit',
    });
  });

  it('stops the active run by its run id', async () => {
    const { appStore, runActivePython, stopPythonRun } = await setup();
    openTab(appStore);
    await runActivePython();

    await stopPythonRun();

    expect(mocks.stop).toHaveBeenCalledWith('run-1');
  });

  it('subscribes to platform events only once', async () => {
    const { appStore, runActivePython } = await setup();
    openTab(appStore);

    await runActivePython();
    (handler as (event: PythonEvent) => void)({
      kind: 'exit',
      runId: 'run-1',
      reason: 'exit',
      code: 0,
      durationMs: 10,
    });

    mocks.run.mockResolvedValue({ ok: true, runId: 'run-2' });
    await runActivePython();

    expect(mocks.onEvent).toHaveBeenCalledTimes(1);
  });

  it('registers the Python: Run file command with Ctrl+Enter', async () => {
    await setup();
    const { getCommands } = await import('../src/commands/registry');

    const command = getCommands().find((candidate) => candidate.id === 'python.run');

    expect(command?.title).toBe('Python: Run file');
    expect(command?.keybinding).toBe('Ctrl+Enter');
  });

  it('reports a rejected run and returns to idle', async () => {
    mocks.run.mockResolvedValue({ ok: false, message: 'No workspace folder is open.' });

    const { appStore, runActivePython } = await setup();
    openTab(appStore);

    await runActivePython();

    expect(mocks.appendPythonLines).toHaveBeenCalledWith([
      { stream: 'stderr', text: 'No workspace folder is open.', loc: null },
    ]);
    expect(mocks.setPythonRun).toHaveBeenLastCalledWith({ state: 'idle' });
  });
});
