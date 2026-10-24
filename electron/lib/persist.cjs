'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const SETTINGS_FILE = 'settings.json';
const SESSION_FILE = 'session.json';
const RECENT_FOLDERS_FILE = 'recent-folders.json';
const LOCAL_FILES = Object.freeze([SETTINGS_FILE, SESSION_FILE, RECENT_FOLDERS_FILE]);

const MAX_RECENT_FOLDERS = 5;
const MAX_PATH_LENGTH = 4096;
const MAX_TABS = 500;
const MAX_CURSOR_VALUE = 10_000_000;

const THEMES = Object.freeze(['dark', 'light']);
const TAB_SIZES = Object.freeze([2, 4, 8]);
const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 24;
const MIN_TREE_FONT_SIZE = 10;
const MAX_TREE_FONT_SIZE = 18;

const DEFAULT_SETTINGS = Object.freeze({
  theme: 'dark',
  fontSize: 14,
  tabSize: 2,
  wordWrap: false,
  renderWhitespace: false,
  treeFontSize: 13,
});

const DEFAULT_SESSION = Object.freeze({
  workspaceRoot: null,
  tabs: [],
  activeRelPath: null,
});

const MESSAGES = Object.freeze({
  settingsMissing: 'No saved settings were found; Forge is using the default settings.',
  settingsInvalid: 'The saved settings could not be understood; Forge is using the default settings.',
  settingsUnreadable: 'The saved settings could not be read; Forge is using the default settings.',
  sessionMissing: 'No saved session was found; Forge starts with an empty workspace.',
  sessionInvalid: 'The saved session could not be understood; Forge starts with an empty workspace.',
  sessionUnreadable: 'The saved session could not be read; Forge starts with an empty workspace.',
  recentMissing: 'No recently opened folders were found.',
  recentInvalid: 'The list of recently opened folders could not be understood; it was reset.',
  recentUnreadable: 'The list of recently opened folders could not be read; it was reset.',
});

function defaultSettings() {
  return { ...DEFAULT_SETTINGS };
}

function defaultSession() {
  return { workspaceRoot: null, tabs: [], activeRelPath: null };
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value, maxLength) {
  return typeof value === 'string'
    && value.trim().length > 0
    && value.length <= maxLength
    && !value.includes('\0');
}

function isAbsolutePathString(value) {
  if (!isNonEmptyString(value, MAX_PATH_LENGTH)) return false;
  return path.isAbsolute(value) || path.win32.isAbsolute(value);
}

function isRelativePathString(value) {
  if (!isNonEmptyString(value, MAX_PATH_LENGTH)) return false;
  if (path.isAbsolute(value) || path.win32.isAbsolute(value)) return false;
  if (value.startsWith('\\') || /^[A-Za-z]:/.test(value)) return false;
  const segments = value.replace(/\\/g, '/').split('/');
  return !segments.some((segment) => segment === '..');
}

function isCursor(value) {
  if (!isPlainObject(value)) return false;
  const { line, column } = value;
  return Number.isInteger(line)
    && Number.isInteger(column)
    && line >= 1
    && column >= 1
    && line <= MAX_CURSOR_VALUE
    && column <= MAX_CURSOR_VALUE;
}

function normalizeSettings(value) {
  if (!isPlainObject(value)) return null;

  const { theme, fontSize, tabSize, wordWrap, renderWhitespace, treeFontSize } = value;

  if (!THEMES.includes(theme)) return null;
  if (!Number.isInteger(fontSize) || fontSize < MIN_FONT_SIZE || fontSize > MAX_FONT_SIZE) return null;
  if (!TAB_SIZES.includes(tabSize)) return null;
  if (typeof wordWrap !== 'boolean') return null;
  if (typeof renderWhitespace !== 'boolean') return null;
  if (!Number.isInteger(treeFontSize)
    || treeFontSize < MIN_TREE_FONT_SIZE
    || treeFontSize > MAX_TREE_FONT_SIZE) {
    return null;
  }

  return { theme, fontSize, tabSize, wordWrap, renderWhitespace, treeFontSize };
}

function normalizeTabs(tabs) {
  if (!Array.isArray(tabs) || tabs.length > MAX_TABS) return null;

  const normalized = [];
  for (const tab of tabs) {
    if (!isPlainObject(tab)) return null;
    const { relPath, cursor } = tab;
    if (!isRelativePathString(relPath) || !isCursor(cursor)) return null;
    normalized.push({
      relPath,
      cursor: { line: cursor.line, column: cursor.column },
    });
  }
  return normalized;
}

function normalizeSession(value) {
  if (!isPlainObject(value)) return null;

  const { workspaceRoot, tabs, activeRelPath } = value;

  if (workspaceRoot !== null && !isAbsolutePathString(workspaceRoot)) return null;

  const normalizedTabs = normalizeTabs(tabs);
  if (normalizedTabs === null) return null;

  if (activeRelPath !== null) {
    if (!isRelativePathString(activeRelPath)) return null;
    const matchesTab = normalizedTabs.some((tab) => tab.relPath === activeRelPath);
    if (!matchesTab) return null;
  }

  return {
    workspaceRoot,
    tabs: normalizedTabs,
    activeRelPath,
  };
}

function recentFolderKey(absPath) {
  const normalized = path.normalize(absPath);
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

function normalizeRecentFolders(value) {
  if (!Array.isArray(value)) return null;

  const seen = new Set();
  const folders = [];

  for (const entry of value) {
    if (!isAbsolutePathString(entry)) return null;
    const key = recentFolderKey(entry);
    if (seen.has(key)) continue;
    seen.add(key);
    folders.push(entry);
    if (folders.length >= MAX_RECENT_FOLDERS) break;
  }

  return folders;
}

function describeError(error) {
  if (error && typeof error.message === 'string' && error.message.trim().length > 0) {
    return error.message.trim();
  }
  return 'Unknown error';
}

function readJsonFile(userDataDir, fileName, missingMessage, unreadableMessage) {
  if (typeof userDataDir !== 'string' || userDataDir.trim().length === 0) {
    return { status: 'unreadable', value: undefined, message: unreadableMessage };
  }

  let text;
  try {
    text = fs.readFileSync(path.join(userDataDir, fileName), 'utf8');
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return { status: 'missing', value: undefined, message: missingMessage };
    }
    return { status: 'unreadable', value: undefined, message: unreadableMessage };
  }

  if (typeof text !== 'string' || text.trim().length === 0) {
    return { status: 'invalid', value: undefined, message: null };
  }

  try {
    return { status: 'ok', value: JSON.parse(text), message: null };
  } catch {
    return { status: 'invalid', value: undefined, message: null };
  }
}

function readSettings(userDataDir) {
  const result = readJsonFile(
    userDataDir,
    SETTINGS_FILE,
    MESSAGES.settingsMissing,
    MESSAGES.settingsUnreadable,
  );

  if (result.status !== 'ok') {
    const message = result.message === null ? MESSAGES.settingsInvalid : result.message;
    return { status: result.status === 'missing' ? 'missing' : 'invalid', settings: defaultSettings(), message };
  }

  const settings = normalizeSettings(result.value);
  if (settings === null) {
    return { status: 'invalid', settings: defaultSettings(), message: MESSAGES.settingsInvalid };
  }

  return { status: 'ok', settings, message: null };
}

function readSession(userDataDir) {
  const result = readJsonFile(
    userDataDir,
    SESSION_FILE,
    MESSAGES.sessionMissing,
    MESSAGES.sessionUnreadable,
  );

  if (result.status !== 'ok') {
    const message = result.message === null ? MESSAGES.sessionInvalid : result.message;
    return { status: result.status === 'missing' ? 'missing' : 'invalid', session: defaultSession(), message };
  }

  const session = normalizeSession(result.value);
  if (session === null) {
    return { status: 'invalid', session: defaultSession(), message: MESSAGES.sessionInvalid };
  }

  return { status: 'ok', session, message: null };
}

function readRecentFolders(userDataDir) {
  const result = readJsonFile(
    userDataDir,
    RECENT_FOLDERS_FILE,
    MESSAGES.recentMissing,
    MESSAGES.recentUnreadable,
  );

  if (result.status !== 'ok') {
    const message = result.message === null ? MESSAGES.recentInvalid : result.message;
    return { status: result.status === 'missing' ? 'missing' : 'invalid', folders: [], message };
  }

  const folders = normalizeRecentFolders(result.value);
  if (folders === null) {
    return { status: 'invalid', folders: [], message: MESSAGES.recentInvalid };
  }

  return { status: 'ok', folders, message: null };
}

function atomicWriteJson(userDataDir, fileName, value, failureLabel) {
  if (typeof userDataDir !== 'string' || userDataDir.trim().length === 0) {
    return { ok: false, message: `${failureLabel} could not be saved: no local data directory is available.` };
  }

  let contents;
  try {
    contents = `${JSON.stringify(value, null, 2)}\n`;
  } catch {
    return { ok: false, message: `${failureLabel} could not be saved: the value is not valid JSON.` };
  }

  const targetPath = path.join(userDataDir, fileName);
  const suffix = crypto.randomBytes(8).toString('hex');
  const tempPath = path.join(userDataDir, `.${fileName}.${process.pid}.${suffix}.tmp`);

  let descriptor = null;
  try {
    fs.mkdirSync(userDataDir, { recursive: true });
    descriptor = fs.openSync(tempPath, 'wx', 0o600);
    fs.writeFileSync(descriptor, contents, 'utf8');
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = null;
    fs.renameSync(tempPath, targetPath);
    return { ok: true };
  } catch (error) {
    if (descriptor !== null) {
      try {
        fs.closeSync(descriptor);
      } catch (closeError) {
        void closeError;
      }
    }
    try {
      fs.rmSync(tempPath, { force: true });
    } catch (removeError) {
      void removeError;
    }
    return { ok: false, message: `${failureLabel} could not be saved: ${describeError(error)}` };
  }
}

function writeSettings(userDataDir, settings) {
  const normalized = normalizeSettings(settings);
  if (normalized === null) {
    return { ok: false, message: 'Settings could not be saved: the settings are invalid.' };
  }
  return atomicWriteJson(userDataDir, SETTINGS_FILE, normalized, 'Settings');
}

function writeSession(userDataDir, session) {
  const normalized = normalizeSession(session);
  if (normalized === null) {
    return { ok: false, message: 'The session could not be saved: the session is invalid.' };
  }
  return atomicWriteJson(userDataDir, SESSION_FILE, normalized, 'The session');
}

function addRecentFolder(userDataDir, absPath) {
  if (!isAbsolutePathString(absPath)) {
    return { ok: false, message: 'A recently opened folder must be an absolute path.' };
  }

  const current = readRecentFolders(userDataDir);
  const list = current.status === 'ok' ? current.folders : [];
  const normalized = path.normalize(absPath);
  const key = recentFolderKey(normalized);
  const next = [normalized, ...list.filter((entry) => recentFolderKey(entry) !== key)]
    .slice(0, MAX_RECENT_FOLDERS);

  return atomicWriteJson(userDataDir, RECENT_FOLDERS_FILE, next, 'The list of recent folders');
}

function fileExists(userDataDir, fileName) {
  try {
    fs.accessSync(path.join(userDataDir, fileName), fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function ensureLocalData(userDataDir) {
  if (typeof userDataDir !== 'string' || userDataDir.trim().length === 0) {
    return { ok: false, message: 'Local data could not be prepared: no local data directory is available.' };
  }

  try {
    fs.mkdirSync(userDataDir, { recursive: true });
  } catch (error) {
    return { ok: false, message: `Local data could not be prepared: ${describeError(error)}` };
  }

  if (!fileExists(userDataDir, SETTINGS_FILE)) {
    const result = writeSettings(userDataDir, defaultSettings());
    if (!result.ok) return result;
  }
  if (!fileExists(userDataDir, SESSION_FILE)) {
    const result = writeSession(userDataDir, defaultSession());
    if (!result.ok) return result;
  }
  if (!fileExists(userDataDir, RECENT_FOLDERS_FILE)) {
    const result = atomicWriteJson(userDataDir, RECENT_FOLDERS_FILE, [], 'The list of recent folders');
    if (!result.ok) return result;
  }

  return { ok: true };
}

function clearLocalData(userDataDir) {
  if (typeof userDataDir !== 'string' || userDataDir.trim().length === 0) {
    return { ok: false, message: 'Local data could not be deleted: no local data directory is available.' };
  }

  const failures = [];
  for (const fileName of LOCAL_FILES) {
    try {
      fs.rmSync(path.join(userDataDir, fileName), { force: true });
    } catch (error) {
      failures.push(`${fileName}: ${describeError(error)}`);
    }
  }

  if (failures.length > 0) {
    return { ok: false, message: `Some local data could not be deleted (${failures.join('; ')}).` };
  }
  return { ok: true };
}

module.exports = {
  SETTINGS_FILE,
  SESSION_FILE,
  RECENT_FOLDERS_FILE,
  LOCAL_FILES,
  MAX_RECENT_FOLDERS,
  DEFAULT_SETTINGS,
  DEFAULT_SESSION,
  defaultSettings,
  defaultSession,
  normalizeSettings,
  normalizeSession,
  normalizeRecentFolders,
  isAbsolutePathString,
  isRelativePathString,
  readSettings,
  readSession,
  readRecentFolders,
  writeSettings,
  writeSession,
  addRecentFolder,
  ensureLocalData,
  clearLocalData,
};
