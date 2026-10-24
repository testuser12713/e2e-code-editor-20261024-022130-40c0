'use strict';

const childProcess = require('node:child_process');
const crypto = require('node:crypto');
const path = require('node:path');
const { StringDecoder } = require('node:string_decoder');

const { resolveInWorkspace } = require('./pathGuard.cjs');

const RUN_TIMEOUT_MS = 60000;
const PROBE_TIMEOUT_MS = 5000;
const MAX_PATH_LENGTH = 4096;

const PYTHON_CANDIDATES = [
  ['python3'],
  ['python'],
  ['py', '-3'],
];

const ENV_ALLOWLIST = ['PATH', 'PATHEXT', 'SYSTEMROOT', 'TEMP', 'HOME', 'USERPROFILE'];

const CHECK_SCRIPT = [
  'import json',
  'import sys',
  '',
  'path = sys.argv[1]',
  'try:',
  '    with open(path, "rb") as handle:',
  '        source = handle.read()',
  '    compile(source, path, "exec", dont_inherit=True)',
  '    text = source.decode("utf-8", "replace")',
  '    print(json.dumps({"ok": True, "lineCount": len(text.splitlines())}))',
  'except SyntaxError as error:',
  '    print(json.dumps({',
  '        "ok": False,',
  '        "syntax": True,',
  '        "line": error.lineno or 0,',
  '        "column": error.offset or 0,',
  '        "sourceText": (error.text or "").rstrip("\\r\\n"),',
  '        "message": error.msg or "invalid syntax",',
  '    }))',
  'except OSError as error:',
  '    print(json.dumps({"ok": False, "syntax": False, "message": str(error)}))',
].join('\n');

const FILE_REFERENCE = /File ["']([^"']+)["'], line (\d+)(?:, column (\d+))?/;

function buildArgs(scriptPath) {
  return ['-u', '-B', scriptPath];
}

function buildEnv(source = process.env, platform = process.platform) {
  const env = {};
  if (source && typeof source === 'object') {
    for (const key of ENV_ALLOWLIST) {
      const value = source[key];
      if (typeof value === 'string' && value.length > 0) {
        env[key] = value;
      }
    }
    if (platform === 'win32') {
      for (const key of ['Path', 'SystemRoot', 'Temp']) {
        const value = source[key];
        if (typeof value === 'string' && value.length > 0 && env[key.toUpperCase()] === undefined) {
          env[key] = value;
        }
      }
    }
  }
  env.PYTHONIOENCODING = 'utf-8';
  return env;
}

function killRunTree(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return;

  if (process.platform === 'win32') {
    try {
      childProcess.spawn('taskkill', ['/pid', String(pid), '/T', '/F'], {
        shell: false,
        windowsHide: true,
        stdio: 'ignore',
      });
    } catch {
      void 0;
    }
    return;
  }

  try {
    process.kill(-pid, 'SIGKILL');
  } catch {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      void 0;
    }
  }
}

function killChildTree(child, platform, spawnFn) {
  if (!child) return;
  const pid = typeof child.pid === 'number' ? child.pid : null;

  if (platform === 'win32') {
    if (pid !== null && pid > 0) {
      try {
        spawnFn('taskkill', ['/pid', String(pid), '/T', '/F'], {
          shell: false,
          windowsHide: true,
          stdio: 'ignore',
        });
      } catch {
        void 0;
      }
    }
    try {
      if (typeof child.kill === 'function') child.kill();
    } catch {
      void 0;
    }
    return;
  }

  if (pid !== null && pid > 0) {
    try {
      process.kill(-pid, 'SIGKILL');
    } catch {
      try {
        process.kill(pid, 'SIGKILL');
      } catch {
        void 0;
      }
    }
  }
  try {
    if (typeof child.kill === 'function') child.kill('SIGKILL');
  } catch {
    void 0;
  }
}

function createInterpreterResolver(deps = {}) {
  const spawn = deps.spawn || childProcess.spawn;
  const setTimeoutFn = deps.setTimeout || setTimeout;
  const clearTimeoutFn = deps.clearTimeout || clearTimeout;
  const envSource = deps.env || process.env;
  const platform = deps.platform || process.platform;
  const probeTimeoutMs = deps.probeTimeoutMs || PROBE_TIMEOUT_MS;

  let resolved = null;

  function probe(candidate) {
    return new Promise((resolve) => {
      let child;
      try {
        child = spawn(candidate[0], [...candidate.slice(1), '--version'], {
          shell: false,
          env: buildEnv(envSource, platform),
          windowsHide: true,
          stdio: ['ignore', 'pipe', 'pipe'],
        });
      } catch {
        resolve(null);
        return;
      }

      if (!child || typeof child.on !== 'function') {
        resolve(null);
        return;
      }

      let output = '';
      let settled = false;
      let timer = null;

      const finish = (value) => {
        if (settled) return;
        settled = true;
        if (timer !== null) clearTimeoutFn(timer);
        resolve(value);
      };

      timer = setTimeoutFn(() => {
        try {
          if (typeof child.kill === 'function') child.kill();
        } catch {
          void 0;
        }
        finish(null);
      }, probeTimeoutMs);

      const collect = (chunk) => {
        if (settled) return;
        output += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
      };

      if (child.stdout && typeof child.stdout.on === 'function') {
        child.stdout.on('data', collect);
      }
      if (child.stderr && typeof child.stderr.on === 'function') {
        child.stderr.on('data', collect);
      }
      child.on('error', () => finish(null));
      child.on('close', () => {
        const match = /Python\s+(\d+)\.(\d+)\.(\d+)/i.exec(output);
        if (!match || Number(match[1]) !== 3) {
          finish(null);
          return;
        }
        finish({
          path: candidate[0],
          prefixArgs: candidate.slice(1),
          interpreter: {
            found: true,
            path: candidate[0],
            version: `${match[1]}.${match[2]}.${match[3]}`,
          },
        });
      });
    });
  }

  async function resolveEntry() {
    if (resolved !== null) return resolved;

    for (const candidate of PYTHON_CANDIDATES) {
      const result = await probe(candidate);
      if (result) {
        resolved = result;
        return resolved;
      }
    }

    resolved = { path: null, prefixArgs: [], interpreter: { found: false } };
    return resolved;
  }

  async function resolve() {
    const entry = await resolveEntry();
    return entry.interpreter;
  }

  function reset() {
    resolved = null;
  }

  return { resolve, resolveEntry, reset };
}

function splitLines(record, stream) {
  const key = stream === 'stdout' ? 'stdoutRemainder' : 'stderrRemainder';

  return (chunk) => {
    if (record.settled) return;
    record[key] += Buffer.isBuffer(chunk)
      ? record.decoders[stream].write(chunk)
      : String(chunk);

    let index = record[key].indexOf('\n');
    while (index !== -1) {
      let line = record[key].slice(0, index);
      record[key] = record[key].slice(index + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      emitOutput(record, stream, line);
      index = record[key].indexOf('\n');
    }
  };
}

function flushRemainder(record, stream) {
  const key = stream === 'stdout' ? 'stdoutRemainder' : 'stderrRemainder';
  record[key] += record.decoders[stream].end();
  if (record[key].length === 0) return;
  let line = record[key];
  record[key] = '';
  if (line.endsWith('\r')) line = line.slice(0, -1);
  emitOutput(record, stream, line);
}

function emitOutput(record, stream, line) {
  if (stream === 'stderr' && !record.stdinEofSent && line.includes('EOFError')) {
    record.stdinEofSent = true;
    record.send({ kind: 'notice', runId: record.runId, notice: 'stdin-eof' });
  }

  record.send({
    kind: 'output',
    runId: record.runId,
    stream,
    text: line,
    loc: locateInWorkspace(record.root, line),
  });
}

function locateInWorkspace(root, line) {
  if (typeof root !== 'string' || root.length === 0) return null;

  const match = FILE_REFERENCE.exec(line);
  if (!match) return null;

  const reference = match[1];
  let relative = reference;

  if (path.isAbsolute(reference)) {
    const candidate = path.relative(path.resolve(root), reference);
    if (candidate === '' || candidate.startsWith('..') || path.isAbsolute(candidate)) return null;
    relative = candidate;
  }

  try {
    const resolved = resolveInWorkspace(root, relative);
    const candidate = path.relative(path.resolve(root), resolved);
    if (candidate === '' || candidate.startsWith('..') || path.isAbsolute(candidate)) return null;

    return {
      relPath: candidate.split(path.sep).join('/'),
      line: Number(match[2]),
      column: match[3] === undefined ? null : Number(match[3]),
    };
  } catch {
    return null;
  }
}

function parseCheckOutput(stdout) {
  const lines = stdout.split(/\r?\n/).filter((line) => line.trim().length > 0);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    try {
      const parsed = JSON.parse(lines[index]);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {
      void 0;
    }
  }
  return null;
}

function createPythonRunner(options = {}) {
  const spawn = options.spawn || childProcess.spawn;
  const setTimeoutFn = options.setTimeout || setTimeout;
  const clearTimeoutFn = options.clearTimeout || clearTimeout;
  const now = options.now || Date.now;
  const envSource = options.env || process.env;
  const platform = options.platform || process.platform;
  const timeoutMs = options.timeoutMs || RUN_TIMEOUT_MS;
  const send = typeof options.send === 'function' ? options.send : () => undefined;
  const kill = typeof options.kill === 'function'
    ? options.kill
    : (child) => killChildTree(child, platform, spawn);
  const resolver = createInterpreterResolver({
    spawn,
    setTimeout: setTimeoutFn,
    clearTimeout: clearTimeoutFn,
    env: envSource,
    platform,
    probeTimeoutMs: options.probeTimeoutMs,
  });

  const runs = new Map();

  function finishRun(record, reason, code) {
    if (record.settled) return;
    record.settled = true;
    if (record.timer !== null) clearTimeoutFn(record.timer);
    record.timer = null;
    runs.delete(record.runId);

    send({
      kind: 'exit',
      runId: record.runId,
      reason,
      code,
      durationMs: Math.max(0, now() - record.startedAt),
    });
  }

  function makeRecord(runId, child, root, startedAt) {
    const record = {
      runId,
      child,
      root,
      startedAt,
      settled: false,
      stdinEofSent: false,
      stdoutRemainder: '',
      stderrRemainder: '',
      decoders: {
        stdout: new StringDecoder('utf8'),
        stderr: new StringDecoder('utf8'),
      },
      timer: null,
      send,
    };

    if (child.stdout && typeof child.stdout.on === 'function') {
      child.stdout.on('data', splitLines(record, 'stdout'));
    }
    if (child.stderr && typeof child.stderr.on === 'function') {
      child.stderr.on('data', splitLines(record, 'stderr'));
    }
    child.on('error', (error) => {
      if (record.settled) return;
      if (error && error.code === 'ENOENT') {
        record.send({ kind: 'notice', runId: record.runId, notice: 'interpreter-missing' });
      }
      flushRemainder(record, 'stdout');
      flushRemainder(record, 'stderr');
      finishRun(record, 'exit', null);
    });
    child.on('close', (code) => {
      if (record.settled) return;
      flushRemainder(record, 'stdout');
      flushRemainder(record, 'stderr');
      finishRun(record, record.timedOut ? 'timeout' : 'exit', code === undefined ? null : code);
    });

    return record;
  }

  async function run(params = {}) {
    const relPath = params.relPath;
    const absolute = params.absolute;
    const root = params.root;

    let entry;
    try {
      entry = await resolver.resolveEntry();
    } catch {
      return { ok: false, message: 'Python could not be started.' };
    }

    const resolved = entry.interpreter;
    const runId = crypto.randomUUID();
    const startedAt = now();

    if (!resolved.found) {
      send({ kind: 'started', runId, interpreter: resolved });
      send({ kind: 'notice', runId, notice: 'interpreter-missing' });
      send({ kind: 'exit', runId, reason: 'exit', code: null, durationMs: 0 });
      return { ok: true, runId };
    }

    let child;
    try {
      child = spawn(resolved.path, [...entry.prefixArgs, ...buildArgs(absolute)], {
        cwd: root,
        env: buildEnv(envSource, platform),
        shell: false,
        detached: platform !== 'win32',
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch {
      return { ok: false, message: `Python could not run ${relPath}.` };
    }

    if (!child || typeof child.on !== 'function') {
      return { ok: false, message: `Python could not run ${relPath}.` };
    }

    send({ kind: 'started', runId, interpreter: resolved });

    const record = makeRecord(runId, child, root, startedAt);
    record.timedOut = false;
    runs.set(runId, record);

    record.timer = setTimeoutFn(() => {
      if (record.settled) return;
      record.timedOut = true;
      finishRun(record, 'timeout', null);
      kill(child);
    }, timeoutMs);

    return { ok: true, runId };
  }

  async function stop(runId) {
    if (typeof runId !== 'string' || runId.length === 0) {
      return { ok: false, message: 'A run id is required.' };
    }

    const record = runs.get(runId);
    if (!record) {
      return { ok: false, message: 'No running Python process has this id.' };
    }

    finishRun(record, 'stopped', null);
    kill(record.child);
    return { ok: true };
  }

  function checkRun(params = {}, entry) {
    const absolute = params.absolute;
    const root = params.root;

    return new Promise((resolve) => {
      let child;
      try {
        child = spawn(entry.path, [...entry.prefixArgs, '-B', '-c', CHECK_SCRIPT, absolute], {
          cwd: root,
          env: buildEnv(envSource, platform),
          shell: false,
          detached: false,
          windowsHide: true,
          stdio: ['ignore', 'pipe', 'pipe'],
        });
      } catch {
        resolve({ ok: false, kind: 'rejected', message: 'The syntax check could not start.' });
        return;
      }

      if (!child || typeof child.on !== 'function') {
        resolve({ ok: false, kind: 'rejected', message: 'The syntax check could not start.' });
        return;
      }

      let stdout = '';
      let stderr = '';
      let settled = false;
      let timer = null;

      const finish = (result) => {
        if (settled) return;
        settled = true;
        if (timer !== null) clearTimeoutFn(timer);
        resolve(result);
      };

      if (child.stdout && typeof child.stdout.on === 'function') {
        child.stdout.on('data', (chunk) => {
          stdout += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
        });
      }
      if (child.stderr && typeof child.stderr.on === 'function') {
        child.stderr.on('data', (chunk) => {
          stderr += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
        });
      }

      child.on('error', () => {
        finish({ ok: false, kind: 'rejected', message: 'The syntax check could not start.' });
      });
      child.on('close', (code) => {
        if (code !== 0) {
          finish({
            ok: false,
            kind: 'rejected',
            message: stderr.trim().length > 0
              ? stderr.trim()
              : 'The syntax check could not complete.',
          });
          return;
        }

        const parsed = parseCheckOutput(stdout);
        if (!parsed) {
          finish({ ok: false, kind: 'rejected', message: 'The syntax check returned no result.' });
          return;
        }

        if (parsed.ok === true) {
          const lineCount = Number(parsed.lineCount);
          finish({ ok: true, lineCount: Number.isFinite(lineCount) ? lineCount : 0 });
          return;
        }

        if (parsed.syntax === true) {
          finish({
            ok: false,
            kind: 'syntax',
            line: Number(parsed.line) || 0,
            column: Number(parsed.column) || 0,
            sourceText: typeof parsed.sourceText === 'string' ? parsed.sourceText : '',
            message: typeof parsed.message === 'string' ? parsed.message : 'invalid syntax',
          });
          return;
        }

        finish({
          ok: false,
          kind: 'rejected',
          message: typeof parsed.message === 'string'
            ? parsed.message
            : 'The syntax check could not complete.',
        });
      });

      timer = setTimeoutFn(() => {
        kill(child);
        finish({ ok: false, kind: 'rejected', message: 'The syntax check timed out.' });
      }, timeoutMs);
    });
  }

  async function check(params = {}) {
    let entry;
    try {
      entry = await resolver.resolveEntry();
    } catch {
      return { ok: false, kind: 'rejected', message: 'The syntax check could not start.' };
    }

    if (!entry.interpreter.found) {
      return { ok: false, kind: 'interpreter-missing' };
    }

    return checkRun(params, entry);
  }

  function killAll() {
    for (const record of Array.from(runs.values())) {
      finishRun(record, 'stopped', null);
      kill(record.child);
    }
  }

  async function interpreter() {
    return resolver.resolve();
  }

  function reset() {
    resolver.reset();
  }

  return { run, stop, check, interpreter, killAll, reset };
}

let sharedResolver = null;

function getSharedResolver() {
  if (sharedResolver === null) sharedResolver = createInterpreterResolver();
  return sharedResolver;
}

async function resolveInterpreter(options) {
  if (options && typeof options === 'object' && (options.spawn || options.env || options.platform)) {
    return createInterpreterResolver(options).resolve();
  }
  return getSharedResolver().resolve();
}

function resetInterpreterCache() {
  if (sharedResolver !== null) sharedResolver.reset();
}

const defaultRunner = createPythonRunner();

module.exports = {
  RUN_TIMEOUT_MS,
  MAX_PATH_LENGTH,
  buildArgs,
  buildEnv,
  killRunTree,
  createRunner: createPythonRunner,
  createPythonRunner,
  resolveInterpreter,
  resetInterpreterCache,
  run: (params) => defaultRunner.run(params),
  stop: (runId) => defaultRunner.stop(runId),
  check: (params) => defaultRunner.check(params),
  interpreter: () => defaultRunner.interpreter(),
  killAll: () => defaultRunner.killAll(),
  CHECK_SCRIPT,
};
