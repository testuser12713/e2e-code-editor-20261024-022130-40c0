'use strict';

const persist = require('../lib/persist.cjs');

function failure(message) {
  return { ok: false, message };
}

function resolveUserDataDir() {
  try {
    const electron = require('electron');
    const app = electron && electron.app;
    if (!app || typeof app.getPath !== 'function') {
      return failure('Local data is not available outside the desktop application.');
    }
    const dir = app.getPath('userData');
    if (typeof dir !== 'string' || dir.trim().length === 0) {
      return failure('The local data directory is not available.');
    }
    return { ok: true, dir };
  } catch (error) {
    const reason = error && typeof error.message === 'string' ? error.message : 'unknown error';
    return failure(`The local data directory is not available: ${reason}`);
  }
}

function report(message) {
  if (typeof message === 'string' && message.length > 0) {
    console.warn(`[persist] ${message}`);
  }
}

function isValidSettings(settings) {
  return persist.normalizeSettings(settings) !== null;
}

function isValidSession(session) {
  return persist.normalizeSession(session) !== null;
}

async function loadSettings() {
  const location = resolveUserDataDir();
  if (!location.ok) {
    report(location.message);
    return persist.defaultSettings();
  }

  const result = persist.readSettings(location.dir);
  if (result.status !== 'ok' && result.status !== 'missing') {
    report(result.message);
  }
  return result.settings;
}

async function saveSettings(settings) {
  if (!isValidSettings(settings)) {
    return failure(
      'Settings could not be saved: theme, fontSize (10-24), tabSize (2, 4 or 8), '
      + 'wordWrap, renderWhitespace and treeFontSize (10-18) are required.',
    );
  }

  const location = resolveUserDataDir();
  if (!location.ok) return location;

  return persist.writeSettings(location.dir, settings);
}

async function loadSession() {
  const location = resolveUserDataDir();
  if (!location.ok) {
    report(location.message);
    return persist.defaultSession();
  }

  const result = persist.readSession(location.dir);
  if (result.status !== 'ok' && result.status !== 'missing') {
    report(result.message);
  }
  return result.session;
}

async function saveSession(session) {
  if (!isValidSession(session)) {
    return failure(
      'The session could not be saved: it must contain a workspace root or null, '
      + 'a list of tabs with relative file paths and cursor positions, and an active path or null.',
    );
  }

  const location = resolveUserDataDir();
  if (!location.ok) return location;

  return persist.writeSession(location.dir, session);
}

async function loadRecentFolders() {
  const location = resolveUserDataDir();
  if (!location.ok) {
    report(location.message);
    return [];
  }

  const result = persist.readRecentFolders(location.dir);
  if (result.status !== 'ok' && result.status !== 'missing') {
    report(result.message);
  }
  return result.folders;
}

async function addRecentFolder(absPath) {
  if (!persist.isAbsolutePathString(absPath)) {
    return failure('A recently opened folder must be an absolute path.');
  }

  const location = resolveUserDataDir();
  if (!location.ok) return location;

  return persist.addRecentFolder(location.dir, absPath);
}

async function clearLocalData() {
  const location = resolveUserDataDir();
  if (!location.ok) return location;

  return persist.clearLocalData(location.dir);
}

async function userDataPath() {
  const location = resolveUserDataDir();
  if (!location.ok) {
    report(location.message);
    return '';
  }
  return location.dir;
}

function initializeLocalData() {
  try {
    const electron = require('electron');
    const app = electron && electron.app;
    if (!app || typeof app.whenReady !== 'function') return;

    Promise.resolve(app.whenReady())
      .then(() => {
        const location = resolveUserDataDir();
        if (!location.ok) return;
        const result = persist.ensureLocalData(location.dir);
        if (!result.ok) report(result.message);
      })
      .catch(() => false);
  } catch {
    return;
  }
}

initializeLocalData();

module.exports = {
  loadSettings,
  saveSettings,
  loadSession,
  saveSession,
  loadRecentFolders,
  addRecentFolder,
  clearLocalData,
  userDataPath,
};
