'use strict';

const fs = require('node:fs');

const { PathError, assertRoot, resolveInWorkspace } = require('./pathGuard.cjs');

const IGNORED_DIRECTORIES = new Set(['node_modules', '.git']);

function compareNames(left, right) {
  const a = left.toLowerCase();
  const b = right.toLowerCase();
  if (a < b) return -1;
  if (a > b) return 1;
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function normalizeRelPath(relPath) {
  if (typeof relPath !== 'string') {
    throw new PathError('Directory path must be a string.', 'invalid-path');
  }
  const normalized = relPath
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .replace(/\/{2,}/g, '/');
  return normalized === '.' ? '' : normalized;
}

function joinRelPath(base, name) {
  return base === '' ? name : `${base}/${name}`;
}

function listDir(rootAbs, relPath = '') {
  const root = assertRoot(rootAbs);
  const directory = normalizeRelPath(relPath);
  const absolute = resolveInWorkspace(root, directory);

  let stats;
  try {
    stats = fs.statSync(absolute);
  } catch {
    throw new PathError(`Directory cannot be read: ${relPath}`, 'io');
  }
  if (!stats.isDirectory()) {
    throw new PathError(`Not a directory: ${relPath}`, 'invalid-path');
  }

  let entries;
  try {
    entries = fs.readdirSync(absolute, { withFileTypes: true });
  } catch {
    throw new PathError(`Directory cannot be read: ${relPath}`, 'io');
  }

  const folders = [];
  const files = [];

  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;

    if (entry.isDirectory()) {
      if (IGNORED_DIRECTORIES.has(entry.name)) continue;
      folders.push({
        name: entry.name,
        relPath: joinRelPath(directory, entry.name),
        kind: 'dir',
      });
    } else if (entry.isFile()) {
      files.push({
        name: entry.name,
        relPath: joinRelPath(directory, entry.name),
        kind: 'file',
      });
    }
  }

  folders.sort((left, right) => compareNames(left.name, right.name));
  files.sort((left, right) => compareNames(left.name, right.name));

  return [...folders, ...files];
}

module.exports = { IGNORED_DIRECTORIES, listDir };
