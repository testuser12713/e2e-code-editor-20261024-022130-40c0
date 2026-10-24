import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { EventEmitter } from 'node:events';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type {
  PythonCheckResult,
  PythonEvent,
  PythonInterpreter,
  PythonStartResult,
} from '../src/state/types';

const require = createRequire(import.meta.url);

type Runner = {
  run(params: { relPath: string; absolute: string; root: string }): Promise<PythonStartResult>;
  stop(runId: unknown): Promise<{ ok: true } | { ok: false; message: string }>;
  check(params: { relPath: string; absolute: string; root: string }): Promise<PythonCheckResult>;
  interpreter(): Promise<PythonInterpreter>;
  killAll(): void;
};

type PythonProcess = {
  RUN_TIMEOUT_MS: number;
  buildArgs(scriptPath: string): string[];
  buildEnv(source?: NodeJS.ProcessEnv, platform?: string): Record<string, string>;
  createRunner(options?: Record<string, unknown>): Runner;
  resolveInterpreter(options?: Record<string, unknown>): Promise<PythonInterpreter>;
  resetInterpreterCache(): void;
  killRunTree(pid: number): void;
};

type FakeChild = EventEmitter & {
  pid: number;
  stdout: EventEmitter;
  stderr: EventEmitter;
  kill: (signal?: string) => void;
};

type SpawnCall = {
  command: string;
  args: string[];
  options: Record<string, unknown>;
  child: FakeChild;
};

type SpawnFn = (command: string, args: string[], options: Record<string, unknown>) => FakeChild;

const pythonProcess = require('../electron/lib/pythonProcess.cjs') as PythonProcess;

function fakeChild(pid: number): FakeChild {
  const child = new EventEmitter() as FakeChild;
  child.pid = pid;
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.kill = vi.fn();
  return child;
}

function createHarness(version = 'Python 3.12.4\n') {
  const calls: SpawnCall[] = [];
  const runChildren: FakeChild[] = [];
  const events: PythonEvent[] = [];
  const timers = new Map<number, { due: number; fn: () => void }>();
  let timerId = 1;
  let clock = 1000;

  const spawn: SpawnFn = (command, args, options) => {
    const child = fakeChild(7000 + calls.length);
    calls.push({ command, args, options, child });

    if (args.includes('--version')) {
      queueMicrotask(() => {
        child.stdout.emit('data', Buffer.from(version));
        child.emit('close', 0);
      });
    } else {
      runChildren.push(child);
    }

    return child;
  };

  const runner = pythonProcess.createRunner({
    spawn,
    send: (event: PythonEvent) => {
      events.push(event);
    },
    now: () => clock,
    setTimeout: (fn: () => void, ms: number) => {
      const id = timerId;
      timerId += 1;
      timers.set(id, { due: clock + ms, fn });
      return id;
    },
    clearTimeout: (id: number) => {
      timers.delete(id);
    },
    kill: (child: FakeChild) => {
      child.kill('SIGKILL');
    },
    env: process.env,
    platform: 'linux',
  });

  function advance(ms: number) {
    clock += ms;
    for (const [id, timer] of Array.from(timers.entries())) {
      if (timer.due <= clock) {
        timers.delete(id);
        timer.fn();
      }
    }
  }

  return { runner, calls, runChildren, events, timers, advance, spawn };
}

function waitForSpawn(harness: ReturnType<typeof createHarness>, count: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const check = () => {
      if (harness.runChildren.length >= count) {
        resolve();
        return;
      }
      if (Date.now() - started > 1000) {
        reject(new Error('the fake child process was not spawned'));
        return;
      }
      setTimeout(check, 1);
    };
    check();
  });
}

const temporaryFolders: string[] = [];

function temporaryRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'forge-python-process-'));
  temporaryFolders.push(root);
  return root;
}

afterEach(() => {
  for (const root of temporaryFolders.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
  vi.restoreAllMocks();
});

describe('python process build helpers', () => {
  it('builds the argument array with unbuffered output and without bytecode', () => {
    expect(pythonProcess.buildArgs('/workspace/reports/inventory_report.py')).toEqual([
      '-u',
      '-B',
      '/workspace/reports/inventory_report.py',
    ]);
  });

  it('builds the child environment from the allowlist only', () => {
    process.env.FORGE_PYTHON_TEST_TOKEN = 'do-not-leak';

    try {
      const env = pythonProcess.buildEnv(process.env, 'linux');

      expect(env.PYTHONIOENCODING).toBe('utf-8');
      expect(env.FORGE_PYTHON_TEST_TOKEN).toBeUndefined();
      expect(env.npm_config_user_agent).toBeUndefined();
      if (process.env.PATH) expect(env.PATH).toBe(process.env.PATH);
      if (process.env.HOME) expect(env.HOME).toBe(process.env.HOME);
    } finally {
      delete process.env.FORGE_PYTHON_TEST_TOKEN;
    }
  });

  it('exports the 60 second run timeout', () => {
    expect(pythonProcess.RUN_TIMEOUT_MS).toBe(60000);
  });
});

describe('interpreter discovery', () => {
  it('tries python3, python and py -3 in order and takes the first Python 3', async () => {
    const commands: { command: string; args: string[] }[] = [];

    const spawn: SpawnFn = (command, args) => {
      commands.push({ command, args });
      const child = fakeChild(1000 + commands.length);

      queueMicrotask(() => {
        if (command === 'python3') {
          child.stdout.emit('data', Buffer.from('Python 2.7.18\n'));
          child.emit('close', 0);
          return;
        }
        if (command === 'python') {
          child.stdout.emit('data', Buffer.from('Python 3.11.9\n'));
          child.emit('close', 0);
          return;
        }
        child.emit('error', new Error('not installed'));
      });

      return child;
    };

    const runner = pythonProcess.createRunner({ spawn, send: () => undefined });

    await expect(runner.interpreter()).resolves.toEqual({
      found: true,
      path: 'python',
      version: '3.11.9',
    });
    expect(commands.map((call) => call.command)).toEqual(['python3', 'python']);
    expect(commands[0].args).toEqual(['--version']);
  });

  it('falls back to the py launcher with -3 when python3 and python are missing', async () => {
    const commands: { command: string; args: string[] }[] = [];

    const spawn: SpawnFn = (command, args) => {
      commands.push({ command, args });
      const child = fakeChild(2000 + commands.length);

      queueMicrotask(() => {
        if (command === 'py') {
          child.stdout.emit('data', Buffer.from('Python 3.13.2\n'));
          child.emit('close', 0);
          return;
        }
        child.emit('error', new Error('not installed'));
      });

      return child;
    };

    const runner = pythonProcess.createRunner({ spawn, send: () => undefined });

    await expect(runner.interpreter()).resolves.toEqual({
      found: true,
      path: 'py',
      version: '3.13.2',
    });
    expect(commands.map((call) => call.command)).toEqual(['python3', 'python', 'py']);
    expect(commands[2].args).toEqual(['-3', '--version']);
  });

  it('answers not found when no candidate reports a Python 3', async () => {
    const spawn: SpawnFn = (_command, _args) => {
      const child = fakeChild(3000);
      queueMicrotask(() => {
        child.stdout.emit('data', Buffer.from('Python 2.7.18\n'));
        child.emit('close', 0);
      });
      return child;
    };

    const runner = pythonProcess.createRunner({ spawn, send: () => undefined });

    await expect(runner.interpreter()).resolves.toEqual({ found: false });
  });
});

describe('running a script', () => {
  it('spawns without a shell, passes the script as one argument and uses an allowlisted env', async () => {
    process.env.FORGE_PYTHON_TEST_TOKEN = 'do-not-leak';
    const root = temporaryRoot();
    const absolute = path.join(root, 'a;rm -rf ~.py');

    try {
      const harness = createHarness();
      const result = await harness.runner.run({
        relPath: 'a;rm -rf ~.py',
        absolute,
        root,
      });

      expect(result.ok).toBe(true);
      expect(harness.calls).toHaveLength(2);

      const call = harness.calls[1];
      expect(call.command).toBe('python3');
      expect(call.args).toEqual(['-u', '-B', absolute]);
      expect(call.args).toHaveLength(3);
      expect(call.options.shell).toBe(false);
      expect(call.options.cwd).toBe(root);
      expect(call.options.stdio).toEqual(['ignore', 'pipe', 'pipe']);

      const env = call.options.env as Record<string, string>;
      expect(env.PYTHONIOENCODING).toBe('utf-8');
      expect(env.FORGE_PYTHON_TEST_TOKEN).toBeUndefined();

      harness.runChildren[0].emit('close', 0);
    } finally {
      delete process.env.FORGE_PYTHON_TEST_TOKEN;
    }
  });

  it('streams stdout and stderr line by line in arrival order and finishes on close', async () => {
    const root = temporaryRoot();
    const harness = createHarness();

    const result = await harness.runner.run({
      relPath: 'script.py',
      absolute: path.join(root, 'script.py'),
      root,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const child = harness.runChildren[0];
    child.stdout.emit('data', Buffer.from('first\nsecond\n'));
    child.stderr.emit('data', Buffer.from('warning\n'));

    expect(harness.events[0]).toMatchObject({ kind: 'started', runId: result.runId });

    const outputs = harness.events.filter((event) => event.kind === 'output');
    expect(outputs).toHaveLength(3);
    expect(outputs.map((event) => (event.kind === 'output' ? event.text : ''))).toEqual([
      'first',
      'second',
      'warning',
    ]);
    expect(outputs.map((event) => (event.kind === 'output' ? event.stream : ''))).toEqual([
      'stdout',
      'stdout',
      'stderr',
    ]);

    child.emit('close', 0);

    const exit = harness.events.find((event) => event.kind === 'exit');
    expect(exit).toMatchObject({ kind: 'exit', runId: result.runId, reason: 'exit', code: 0 });
  });

  it('attaches a location only for files inside the workspace', async () => {
    const root = temporaryRoot();
    const inside = path.join(root, 'reports', 'script.py');
    const outside = path.join(tmpdir(), 'elsewhere', 'script.py');
    const harness = createHarness();

    const result = await harness.runner.run({
      relPath: 'reports/script.py',
      absolute: inside,
      root,
    });
    expect(result.ok).toBe(true);

    const child = harness.runChildren[0];
    child.stderr.emit(
      'data',
      Buffer.from(`  File "${inside}", line 7, in <module>\n  File "${outside}", line 3, in <module>\n`),
    );
    child.emit('close', 1);

    const outputs = harness.events.filter((event) => event.kind === 'output');
    expect(outputs[0]).toMatchObject({
      loc: { relPath: 'reports/script.py', line: 7, column: null },
    });
    expect(outputs[1]).toMatchObject({ loc: null });
  });

  it('raises the stdin-eof notice when stderr reports an EOFError', async () => {
    const root = temporaryRoot();
    const harness = createHarness();

    await harness.runner.run({
      relPath: 'script.py',
      absolute: path.join(root, 'script.py'),
      root,
    });

    const child = harness.runChildren[0];
    child.stderr.emit('data', Buffer.from('EOFError: EOF when reading a line\n'));
    child.emit('close', 1);

    const notice = harness.events.find((event) => event.kind === 'notice');
    expect(notice).toMatchObject({ kind: 'notice', notice: 'stdin-eof' });
    expect(harness.events.filter((event) => event.kind === 'notice')).toHaveLength(1);
  });

  it('finishes an endless run with a timeout after RUN_TIMEOUT_MS', async () => {
    const root = temporaryRoot();
    const harness = createHarness();

    const result = await harness.runner.run({
      relPath: 'loop.py',
      absolute: path.join(root, 'loop.py'),
      root,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    harness.advance(pythonProcess.RUN_TIMEOUT_MS - 1);
    expect(harness.events.some((event) => event.kind === 'exit')).toBe(false);

    harness.advance(1);

    const exit = harness.events.find((event) => event.kind === 'exit');
    expect(exit).toMatchObject({
      kind: 'exit',
      runId: result.runId,
      reason: 'timeout',
      code: null,
      durationMs: pythonProcess.RUN_TIMEOUT_MS,
    });
    expect(harness.runChildren[0].kill).toHaveBeenCalled();
    await expect(harness.runner.stop(result.runId)).resolves.toMatchObject({ ok: false });
  });

  it('stops a running script with reason stopped and kills the child tree', async () => {
    const root = temporaryRoot();
    const harness = createHarness();

    const result = await harness.runner.run({
      relPath: 'loop.py',
      absolute: path.join(root, 'loop.py'),
      root,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const stop = await harness.runner.stop(result.runId);
    expect(stop).toEqual({ ok: true });

    const exit = harness.events.find((event) => event.kind === 'exit');
    expect(exit).toMatchObject({
      kind: 'exit',
      runId: result.runId,
      reason: 'stopped',
      code: null,
    });
    expect(harness.runChildren[0].kill).toHaveBeenCalled();

    await expect(harness.runner.stop(result.runId)).resolves.toMatchObject({ ok: false });
  });

  it('reports a missing interpreter with a notice and an immediate exit', async () => {
    const spawn: SpawnFn = (_command, _args) => {
      const child = fakeChild(4000);
      queueMicrotask(() => {
        child.emit('error', new Error('not installed'));
      });
      return child;
    };
    const events: PythonEvent[] = [];
    const runner = pythonProcess.createRunner({ spawn, send: (event: PythonEvent) => events.push(event) });
    const root = temporaryRoot();

    const result = await runner.run({
      relPath: 'script.py',
      absolute: path.join(root, 'script.py'),
      root,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(events).toEqual([
      { kind: 'started', runId: result.runId, interpreter: { found: false } },
      { kind: 'notice', runId: result.runId, notice: 'interpreter-missing' },
      { kind: 'exit', runId: result.runId, reason: 'exit', code: null, durationMs: 0 },
    ]);
  });

  it('kills every live run on killAll', async () => {
    const root = temporaryRoot();
    const harness = createHarness();

    const first = await harness.runner.run({
      relPath: 'one.py',
      absolute: path.join(root, 'one.py'),
      root,
    });
    const second = await harness.runner.run({
      relPath: 'two.py',
      absolute: path.join(root, 'two.py'),
      root,
    });
    expect(first.ok && second.ok).toBe(true);

    harness.runner.killAll();

    const exits = harness.events.filter((event) => event.kind === 'exit');
    expect(exits).toHaveLength(2);
    expect(exits.every((event) => event.kind === 'exit' && event.reason === 'stopped')).toBe(true);
    expect(harness.runChildren[0].kill).toHaveBeenCalled();
    expect(harness.runChildren[1].kill).toHaveBeenCalled();
  });
});

describe('syntax checking', () => {
  it('compiles without running the file and reports the line count', async () => {
    const root = temporaryRoot();
    const absolute = path.join(root, 'script.py');
    writeFileSync(absolute, 'print("hello")\n');
    const harness = createHarness();

    const pending = harness.runner.check({ relPath: 'script.py', absolute, root });
    await waitForSpawn(harness, 1);

    const call = harness.calls[harness.calls.length - 1];
    expect(call.command).toBe('python3');
    expect(call.args[0]).toBe('-B');
    expect(call.args[1]).toBe('-c');
    expect(call.args[2]).toContain('compile(');
    expect(call.args[2]).not.toContain('py_compile');
    expect(call.args[3]).toBe(absolute);
    expect(call.options.shell).toBe(false);

    harness.runChildren[0].stdout.emit(
      'data',
      Buffer.from(`${JSON.stringify({ ok: true, lineCount: 40 })}\n`),
    );
    harness.runChildren[0].emit('close', 0);

    await expect(pending).resolves.toEqual({ ok: true, lineCount: 40 });
  });

  it('answers a syntax error with line, column and source text', async () => {
    const root = temporaryRoot();
    const absolute = path.join(root, 'broken.py');
    writeFileSync(absolute, 'import csv, math,\n');
    const harness = createHarness();

    const pending = harness.runner.check({ relPath: 'broken.py', absolute, root });
    await waitForSpawn(harness, 1);

    harness.runChildren[0].stdout.emit(
      'data',
      Buffer.from(`${JSON.stringify({
        ok: false,
        syntax: true,
        line: 4,
        column: 17,
        sourceText: 'import csv, math,',
        message: 'invalid syntax',
      })}\n`),
    );
    harness.runChildren[0].emit('close', 0);

    await expect(pending).resolves.toEqual({
      ok: false,
      kind: 'syntax',
      line: 4,
      column: 17,
      sourceText: 'import csv, math,',
      message: 'invalid syntax',
    });
  });

  it('answers interpreter-missing when no Python 3 is installed', async () => {
    const spawn: SpawnFn = (_command, _args) => {
      const child = fakeChild(5000);
      queueMicrotask(() => child.emit('error', new Error('not installed')));
      return child;
    };
    const runner = pythonProcess.createRunner({ spawn, send: () => undefined });
    const root = temporaryRoot();

    await expect(
      runner.check({ relPath: 'script.py', absolute: path.join(root, 'script.py'), root }),
    ).resolves.toEqual({ ok: false, kind: 'interpreter-missing' });
  });
});

describe('path validation', () => {
  it('rejects absolute paths, traversal and non-Python files without starting a process', async () => {
    const root = temporaryRoot();
    const childProcess = require('node:child_process') as typeof import('node:child_process');
    const spawnSpy = vi.spyOn(childProcess, 'spawn').mockImplementation(() => {
      throw new Error('no process may start for a rejected path');
    });

    const workspaceHandlers = require('../electron/handlers/workspace.cjs') as {
      openFolder(absPath: unknown): Promise<{ ok: boolean }>;
    };
    const { grantRoot } = require('../electron/lib/pathGuard.cjs') as {
      grantRoot: (absPath: string) => string | null;
    };
    const pythonHandlers = require('../electron/handlers/python.cjs') as {
      run(relPath: unknown): Promise<PythonStartResult>;
      check(relPath: unknown): Promise<PythonCheckResult>;
      stop(runId: unknown): Promise<{ ok: boolean }>;
    };

    grantRoot(root);
    await workspaceHandlers.openFolder(root);
    spawnSpy.mockClear();

    const invalid = [
      path.join(root, 'script.py'),
      '/tmp/script.py',
      '../script.py',
      'reports/../../script.py',
      'notes.txt',
      '',
      42,
    ];

    for (const value of invalid) {
      const runResult = await pythonHandlers.run(value);
      expect(runResult.ok).toBe(false);
      if (!runResult.ok) expect(runResult.message.length).toBeGreaterThan(0);

      const checkResult = await pythonHandlers.check(value);
      expect(checkResult.ok).toBe(false);
      if (!checkResult.ok) expect(checkResult.kind).toBe('rejected');
    }

    expect(spawnSpy).not.toHaveBeenCalled();
    spawnSpy.mockRestore();
  });
});
