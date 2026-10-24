'use strict';

const path = require('node:path');

const fileTree = require('../lib/fileTree.cjs');
const persist = require('../lib/persist.cjs');
const {
  PathError,
  assertRoot,
  grantRoot,
  isRootGranted,
} = require('../lib/pathGuard.cjs');

const MAX_PATH_LENGTH = 4096;

let workspaceRoot = null;

function failure(message) {
  return { ok: false, message };
}

function errorMessage(error, fallback) {
  if (error && typeof error.message === 'string' && error.message.length > 0) {
    return error.message;
  }
  return fallback;
}

function isPathArgument(value) {
  return typeof value === 'string'
    && value.trim().length > 0
    && value.length <= MAX_PATH_LENGTH
    && !value.includes('\0');
}

function requireRoot() {
  if (workspaceRoot === null) {
    throw new Error('No workspace folder is open.');
  }
  return workspaceRoot;
}

function userDataDir() {
  try {
    const electron = require('electron');
    const app = electron && electron.app;
    if (!app || typeof app.getPath !== 'function') return null;
    const dir = app.getPath('userData');
    return typeof dir === 'string' && dir.trim().length > 0 ? dir : null;
  } catch {
    return null;
  }
}

function grantPersistedFolders() {
  const dir = userDataDir();
  if (dir === null) return;

  const recent = persist.readRecentFolders(dir);
  if (recent.status === 'ok') {
    for (const folder of recent.folders) grantRoot(folder);
  }

  const saved = persist.readSession(dir);
  if (saved.status === 'ok' && saved.session.workspaceRoot !== null) {
    grantRoot(saved.session.workspaceRoot);
  }
}

async function openDialog() {
  let dialog = null;
  try {
    const electron = require('electron');
    dialog = electron && electron.dialog;
  } catch {
    return null;
  }
  if (!dialog || typeof dialog.showOpenDialog !== 'function') {
    return null;
  }

  try {
    const result = await dialog.showOpenDialog({
      title: 'Open Folder',
      properties: ['openDirectory'],
    });
    if (!result || result.canceled || !Array.isArray(result.filePaths)) return null;
    const selected = result.filePaths[0];
    if (typeof selected !== 'string' || selected.length === 0) return null;
    grantRoot(selected);
    return selected;
  } catch {
    return null;
  }
}

async function openFolder(absPath) {
  if (!isPathArgument(absPath)) {
    return failure('A workspace folder path is required.');
  }
  if (!path.isAbsolute(absPath)) {
    return failure('The workspace folder must be an absolute path.');
  }

  grantPersistedFolders();
  if (!isRootGranted(absPath)) {
    return failure('The folder was not opened through Open Folder. Grant access to it first.');
  }

  try {
    workspaceRoot = assertRoot(absPath);
    return { ok: true };
  } catch (error) {
    return failure(errorMessage(error, `The folder cannot be opened: ${absPath}`));
  }
}

async function getRoot() {
  return workspaceRoot;
}

async function listDir(relPath) {
  if (typeof relPath !== 'string') {
    throw new Error('Directory path must be a string.');
  }
  if (relPath.length > MAX_PATH_LENGTH || relPath.includes('\0')) {
    throw new Error('Directory path is not valid.');
  }

  const root = requireRoot();

  try {
    return fileTree.listDir(root, relPath);
  } catch (error) {
    if (error instanceof PathError) {
      throw new Error(error.message);
    }
    throw new Error('The folder cannot be read.');
  }
}

module.exports = { openDialog, openFolder, getRoot, listDir };
