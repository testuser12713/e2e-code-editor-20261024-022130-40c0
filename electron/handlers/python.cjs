'use strict';

const fs = require('node:fs');

const { PathError, resolveInWorkspace } = require('../lib/pathGuard.cjs');
const pythonProcess = require('../lib/pythonProcess.cjs');
const workspace = require('./workspace.cjs');

const MAX_PATH_LENGTH = 4096;

function isPathArgument(value) {
  return typeof value === 'string'
    && value.trim().length > 0
    && value.length <= MAX_PATH_LENGTH
    && !value.includes('\0');
}

function hasPythonSuffix(value) {
  return typeof value === 'string' && /\.py$/i.test(value);
}

function errorMessage(error, fallback) {
  if (error && typeof error.message === 'string' && error.message.length > 0) {
    return error.message;
  }
  return fallback;
}

async function requireRoot() {
  const root = await workspace.getRoot();
  if (typeof root !== 'string' || root.length === 0) {
    throw new PathError('No workspace folder is open.', 'io');
  }
  return root;
}

async function resolveTarget(relPath, action) {
  if (!isPathArgument(relPath)) {
    return { ok: false, message: 'The file path must be a relative path to a Python file.' };
  }
  if (!hasPythonSuffix(relPath)) {
    return { ok: false, message: `Only Python (.py) files can be ${action}.` };
  }

  let root;
  try {
    root = await requireRoot();
  } catch (error) {
    return { ok: false, message: errorMessage(error, 'No workspace folder is open.') };
  }

  let absolute;
  try {
    absolute = resolveInWorkspace(root, relPath);
  } catch (error) {
    return {
      ok: false,
      message: errorMessage(error, `${relPath} is outside the workspace.`),
    };
  }

  let stats;
  try {
    stats = fs.statSync(absolute);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return { ok: false, message: `The file ${relPath} does not exist.` };
    }
    return { ok: false, message: `The file ${relPath} cannot be read.` };
  }

  if (!stats.isFile()) {
    return { ok: false, message: `${relPath} is not a file.` };
  }

  return { ok: true, root, absolute, relPath };
}

function broadcastPythonEvent(event) {
  let electron = null;
  try {
    electron = require('electron');
  } catch {
    return;
  }

  const BrowserWindow = electron && electron.BrowserWindow;
  if (!BrowserWindow || typeof BrowserWindow.getAllWindows !== 'function') return;

  for (const window of BrowserWindow.getAllWindows()) {
    if (!window || window.isDestroyed()) continue;
    const contents = window.webContents;
    if (!contents || contents.isDestroyed()) continue;
    try {
      contents.send('python:event', event);
    } catch {
      void 0;
    }
  }
}

const runner = pythonProcess.createPythonRunner({ send: broadcastPythonEvent });

let lifecycleBound = false;

function bindLifecycle() {
  if (lifecycleBound) return;
  lifecycleBound = true;

  let electron = null;
  try {
    electron = require('electron');
  } catch {
    return;
  }

  const app = electron && electron.app;
  if (!app || typeof app.on !== 'function') return;

  app.on('before-quit', () => {
    runner.killAll();
  });
  app.on('window-all-closed', () => {
    runner.killAll();
  });
}

bindLifecycle();

async function run(relPath) {
  const target = await resolveTarget(relPath, 'run');
  if (!target.ok) {
    return { ok: false, message: target.message };
  }

  return runner.run({
    relPath: target.relPath,
    absolute: target.absolute,
    root: target.root,
  });
}

async function stop(runId) {
  if (typeof runId !== 'string' || runId.trim().length === 0) {
    return { ok: false, message: 'A run id is required.' };
  }
  return runner.stop(runId);
}

async function check(relPath) {
  const target = await resolveTarget(relPath, 'checked');
  if (!target.ok) {
    return { ok: false, kind: 'rejected', message: target.message };
  }

  return runner.check({
    relPath: target.relPath,
    absolute: target.absolute,
    root: target.root,
  });
}

async function interpreter() {
  return runner.interpreter();
}

function killAllRuns() {
  runner.killAll();
}

module.exports = { run, stop, check, interpreter, killAllRuns };
