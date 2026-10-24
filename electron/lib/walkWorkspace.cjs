'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { assertRoot } = require('./pathGuard.cjs');

const ALWAYS_IGNORED = new Set(['node_modules', '.git']);
const DEFAULT_MAX_FILES = 20000;

function normalizeIgnore(entry) {
  if (typeof entry !== 'string') return '';
  return entry.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '');
}

function isIgnored(ignore, name, relPath) {
  if (ALWAYS_IGNORED.has(name)) return true;
  for (const entry of ignore) {
    if (entry.length === 0) continue;
    if (name === entry || relPath === entry) return true;
    if (relPath.startsWith(`${entry}/`)) return true;
  }
  return false;
}

function walkFiles(rootAbs, options = {}) {
  const root = assertRoot(rootAbs);
  const requestedMax = Number(options.maxFiles);
  const maxFiles = Number.isFinite(requestedMax) && requestedMax > 0
    ? Math.floor(requestedMax)
    : DEFAULT_MAX_FILES;
  const ignore = Array.isArray(options.ignore)
    ? options.ignore.map(normalizeIgnore).filter(Boolean)
    : [];

  const results = [];

  function visit(absDir, relDir) {
    if (results.length >= maxFiles) return;

    let entries;
    try {
      entries = fs.readdirSync(absDir, { withFileTypes: true });
    } catch {
      return;
    }

    entries.sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0));

    for (const entry of entries) {
      if (results.length >= maxFiles) return;
      if (entry.isSymbolicLink()) continue;

      const relPath = relDir === '' ? entry.name : `${relDir}/${entry.name}`;
      if (isIgnored(ignore, entry.name, relPath)) continue;

      if (entry.isDirectory()) {
        visit(path.join(absDir, entry.name), relPath);
      } else if (entry.isFile()) {
        results.push(relPath);
      }
    }
  }

  visit(root, '');
  return results.slice(0, maxFiles);
}

module.exports = { walkFiles };
