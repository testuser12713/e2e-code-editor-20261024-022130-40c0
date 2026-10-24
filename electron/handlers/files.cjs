'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const { PathError, resolveInWorkspace } = require('../lib/pathGuard.cjs');
const workspace = require('./workspace.cjs');

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_PATH_LENGTH = 4096;
const BINARY_SAMPLE_BYTES = 8192;

const LANGUAGE_BY_EXTENSION = {
  js: 'JavaScript',
  jsx: 'JavaScript',
  mjs: 'JavaScript',
  cjs: 'JavaScript',
  ts: 'TypeScript',
  tsx: 'TypeScript',
  json: 'JSON',
  html: 'HTML',
  htm: 'HTML',
  css: 'CSS',
  scss: 'SCSS',
  sass: 'SCSS',
  py: 'Python',
  md: 'Markdown',
  markdown: 'Markdown',
  sh: 'Shell',
  bash: 'Shell',
  zsh: 'Shell',
  yml: 'YAML',
  yaml: 'YAML',
  xml: 'XML',
};

function languageForPath(relPath) {
  const base = path.posix.basename(String(relPath).replace(/\\/g, '/'));
  const dot = base.lastIndexOf('.');
  if (dot <= 0 || dot === base.length - 1) return 'Plain Text';
  const extension = base.slice(dot + 1).toLowerCase();
  return LANGUAGE_BY_EXTENSION[extension] || 'Plain Text';
}

function failure(reason, message) {
  return { ok: false, reason, message };
}

function errorMessage(error, fallback) {
  if (error && typeof error.message === 'string' && error.message.length > 0) {
    return error.message;
  }
  return fallback;
}

function isValidRelativePath(value) {
  return typeof value === 'string'
    && value.trim().length > 0
    && value.length <= MAX_PATH_LENGTH
    && !value.includes('\0');
}

function isBinary(buffer) {
  const sample = buffer.subarray(0, BINARY_SAMPLE_BYTES);
  if (sample.length === 0) return false;

  let suspicious = 0;
  for (const byte of sample) {
    if (byte === 0) return true;
    if (byte === 9 || byte === 10 || byte === 13) continue;
    if (byte < 7 || (byte > 13 && byte < 32)) suspicious += 1;
  }
  if (suspicious / sample.length > 0.3) return true;

  const text = buffer.toString('utf8');
  let replacementCount = 0;
  for (const character of text) {
    if (character === '\uFFFD') replacementCount += 1;
  }
  return replacementCount > 0 && replacementCount / Math.max(text.length, 1) > 0.05;
}

function formatSize(bytes) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${bytes} bytes`;
}

function normalizeEol(content) {
  return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function applyEol(content, eol) {
  const normalized = normalizeEol(content);
  return eol === 'crlf' ? normalized.replace(/\n/g, '\r\n') : normalized;
}

async function requireRoot() {
  const root = await workspace.getRoot();
  if (typeof root !== 'string' || root.length === 0) {
    throw new PathError('No workspace folder is open.', 'io');
  }
  return root;
}

async function resolvePath(relPath) {
  const root = await requireRoot();
  return resolveInWorkspace(root, relPath);
}

async function read(relPath) {
  if (!isValidRelativePath(relPath)) {
    return failure('io', 'The file path is not valid.');
  }

  let absolute;
  try {
    absolute = await resolvePath(relPath);
  } catch (error) {
    return failure(
      error instanceof PathError && error.code === 'outside-workspace' ? 'outside-workspace' : 'io',
      errorMessage(error, `The file ${relPath} is outside the workspace.`),
    );
  }

  let stats;
  try {
    stats = fs.statSync(absolute);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return failure('not-found', `The file ${relPath} does not exist.`);
    }
    return failure('io', `The file ${relPath} cannot be read.`);
  }

  if (!stats.isFile()) {
    return failure('io', `${relPath} is not a file.`);
  }

  if (stats.size > MAX_FILE_BYTES) {
    return failure(
      'too-large',
      `This file is ${formatSize(stats.size)}. The editor limit is 2 MB, so no tab was created.`,
    );
  }

  let buffer;
  try {
    buffer = fs.readFileSync(absolute);
  } catch {
    return failure('io', `The file ${relPath} cannot be read.`);
  }

  if (isBinary(buffer)) {
    return failure(
      'binary',
      'Binary files are not supported in the text editor. No tab was created.',
    );
  }

  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
  } catch {
    return failure('binary', 'This file is not valid UTF-8 text. No tab was created.');
  }

  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  const eol = text.includes('\r\n') ? 'crlf' : 'lf';

  return {
    ok: true,
    content: normalizeEol(text),
    eol,
    encoding: 'utf-8',
    language: languageForPath(relPath),
  };
}

function temporaryPath(absolute) {
  const directory = path.dirname(absolute);
  const suffix = crypto.randomBytes(8).toString('hex');
  return path.join(directory, `.${path.basename(absolute)}.${process.pid}.${suffix}.tmp`);
}

async function write(relPath, content, eol) {
  if (!isValidRelativePath(relPath)) {
    return { ok: false, message: 'The file path is not valid.' };
  }
  if (typeof content !== 'string') {
    return { ok: false, message: 'The file content must be a string.' };
  }
  if (eol !== 'lf' && eol !== 'crlf') {
    return { ok: false, message: 'The line ending must be either "lf" or "crlf".' };
  }

  let absolute;
  try {
    absolute = await resolvePath(relPath);
  } catch (error) {
    return { ok: false, message: errorMessage(error, `The file ${relPath} is outside the workspace.`) };
  }

  const directory = path.dirname(absolute);
  let directoryStats;
  try {
    directoryStats = fs.statSync(directory);
  } catch {
    return { ok: false, message: `The folder for ${relPath} does not exist.` };
  }
  if (!directoryStats.isDirectory()) {
    return { ok: false, message: `The folder for ${relPath} is not a directory.` };
  }

  let mode;
  try {
    const stats = fs.statSync(absolute);
    if (stats.isDirectory()) {
      return { ok: false, message: `${relPath} is a directory.` };
    }
    mode = stats.mode & 0o777;
  } catch (error) {
    if (!error || error.code !== 'ENOENT') {
      return { ok: false, message: `The file ${relPath} cannot be inspected.` };
    }
  }

  const data = Buffer.from(applyEol(content, eol), 'utf8');
  const temporary = temporaryPath(absolute);
  let descriptor = null;

  try {
    descriptor = fs.openSync(temporary, 'wx', mode === undefined ? 0o666 : mode);
    fs.writeFileSync(descriptor, data);
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = null;
    fs.renameSync(temporary, absolute);
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
      if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    } catch (cleanupError) {
      void cleanupError;
    }
    return { ok: false, message: `The file ${relPath} could not be saved: ${errorMessage(error, 'unknown error')}` };
  }
}

module.exports = {
  read,
  write,
  MAX_FILE_BYTES,
  languageForPath,
  isBinary,
  normalizeEol,
};
