'use strict';

const fs = require('node:fs');
const path = require('node:path');

class PathError extends Error {
  constructor(message, code = 'outside-workspace') {
    super(message);
    this.name = 'PathError';
    this.code = code;
  }
}

const grantedRoots = new Set();

function rootKey(realOrResolved) {
  return process.platform === 'win32' ? realOrResolved.toLowerCase() : realOrResolved;
}

function canonicalRootPath(absPath) {
  if (typeof absPath !== 'string' || absPath.trim().length === 0) return null;
  if (!path.isAbsolute(absPath)) return null;

  try {
    return rootKey(fs.realpathSync(absPath));
  } catch {
    return rootKey(path.resolve(absPath));
  }
}

function grantRoot(absPath) {
  const key = canonicalRootPath(absPath);
  if (key === null) return null;
  grantedRoots.add(key);
  return key;
}

function isRootGranted(absPath) {
  const key = canonicalRootPath(absPath);
  return key !== null && grantedRoots.has(key);
}

function assertRoot(absPath) {
  if (typeof absPath !== 'string' || absPath.trim().length === 0) {
    throw new PathError('Workspace root must be a non-empty path.', 'invalid-root');
  }
  if (!path.isAbsolute(absPath)) {
    throw new PathError('Workspace root must be an absolute path.', 'invalid-root');
  }

  let real;
  try {
    real = fs.realpathSync(absPath);
  } catch {
    throw new PathError(`Workspace root does not exist: ${absPath}`, 'invalid-root');
  }

  let stats;
  try {
    stats = fs.statSync(real);
  } catch {
    throw new PathError(`Workspace root is not readable: ${absPath}`, 'invalid-root');
  }
  if (!stats.isDirectory()) {
    throw new PathError(`Workspace root is not a directory: ${absPath}`, 'invalid-root');
  }
  return real;
}

function isInside(root, candidate) {
  const relative = path.relative(root, candidate);
  if (relative === '') return true;
  if (path.isAbsolute(relative)) return false;
  return relative.split(path.sep)[0] !== '..';
}

function isAbsoluteLike(value) {
  return (
    path.isAbsolute(value) ||
    path.win32.isAbsolute(value) ||
    /^[A-Za-z]:/.test(value) ||
    value.startsWith('\\\\')
  );
}

function toSegments(relPath) {
  if (typeof relPath !== 'string') {
    throw new PathError('Path must be a string.', 'invalid-path');
  }
  if (relPath.includes('\0')) {
    throw new PathError('Path must not contain a null byte.', 'invalid-path');
  }
  if (isAbsoluteLike(relPath)) {
    throw new PathError('Path must be relative to the workspace root.', 'outside-workspace');
  }

  const segments = relPath
    .replace(/\\/g, '/')
    .split('/')
    .filter((segment) => segment !== '' && segment !== '.');

  if (segments.some((segment) => segment === '..')) {
    throw new PathError('Path traversal outside the workspace is not allowed.', 'outside-workspace');
  }
  return segments;
}

function assertNoEscapingSymlink(root, candidate) {
  const relative = path.relative(root, candidate);
  if (relative === '') return;

  let current = root;
  for (const segment of relative.split(path.sep)) {
    if (segment === '') continue;
    current = path.join(current, segment);

    let stats;
    try {
      stats = fs.lstatSync(current);
    } catch (error) {
      if (error && (error.code === 'ENOENT' || error.code === 'ENOTDIR')) return;
      throw new PathError(`Path cannot be inspected: ${candidate}`, 'io');
    }
    if (!stats.isSymbolicLink()) continue;

    let target;
    try {
      target = fs.realpathSync(current);
    } catch {
      try {
        target = path.resolve(path.dirname(current), fs.readlinkSync(current));
      } catch {
        throw new PathError(`Symbolic link cannot be resolved: ${current}`, 'io');
      }
    }
    if (!isInside(root, target)) {
      throw new PathError('Path escapes the workspace through a symbolic link.', 'outside-workspace');
    }
  }
}

function resolveExistingAncestor(candidate) {
  let current = candidate;
  const missing = [];

  for (;;) {
    try {
      const real = fs.realpathSync(current);
      return missing.length > 0 ? path.join(real, ...missing) : real;
    } catch (error) {
      if (error && error.code !== 'ENOENT' && error.code !== 'ENOTDIR') {
        throw new PathError(`Path cannot be resolved: ${candidate}`, 'io');
      }
      const parent = path.dirname(current);
      if (parent === current) {
        throw new PathError(`Path cannot be resolved: ${candidate}`, 'io');
      }
      missing.unshift(path.basename(current));
      current = parent;
    }
  }
}

function resolveInWorkspace(root, relPath) {
  const rootReal = assertRoot(root);
  const segments = toSegments(relPath);
  const candidate = path.resolve(rootReal, ...segments);

  if (!isInside(rootReal, candidate)) {
    throw new PathError('Path is outside the workspace.', 'outside-workspace');
  }

  assertNoEscapingSymlink(rootReal, candidate);

  const resolved = resolveExistingAncestor(candidate);
  if (!isInside(rootReal, resolved)) {
    throw new PathError('Path escapes the workspace through a symbolic link.', 'outside-workspace');
  }
  return resolved;
}

module.exports = {
  PathError,
  assertRoot,
  resolveInWorkspace,
  grantRoot,
  isRootGranted,
};
