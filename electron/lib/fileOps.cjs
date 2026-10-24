'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { PathError, assertRoot, resolveInWorkspace } = require('./pathGuard.cjs');

const MAX_PATH_LENGTH = 4096;
const MAX_NAME_LENGTH = 255;

function success() {
  return { ok: true };
}

function failure(message) {
  return { ok: false, message };
}

function errorMessage(error, fallback) {
  if (error && typeof error.message === 'string' && error.message.length > 0) {
    return error.message;
  }
  return fallback;
}

function normalizeRelative(relPath) {
  if (typeof relPath !== 'string') {
    throw new PathError('A path is required.', 'invalid-path');
  }
  if (relPath.length > MAX_PATH_LENGTH) {
    throw new PathError('The path is too long.', 'invalid-path');
  }
  return relPath
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .replace(/\/{2,}/g, '/');
}

function parentRelative(relPath) {
  const slash = relPath.lastIndexOf('/');
  return slash === -1 ? '' : relPath.slice(0, slash);
}

function displayFolder(relPath) {
  return relPath === '' ? 'the workspace root' : relPath;
}

function entryNameLabel(absolute) {
  return path.basename(absolute);
}

function collisionMessage(kind, name, parentRel) {
  const label = kind === 'dir' ? 'folder' : 'file';
  return `A ${label} named ${name} already exists in ${displayFolder(parentRel)}. Nothing was written to disk.`;
}

function renameCollisionMessage(name, parentRel) {
  return `An entry named ${name} already exists in ${displayFolder(parentRel)}. Nothing was written to disk.`;
}

function assertEntryName(absolute) {
  const name = path.basename(absolute);
  if (name === '' || name === '.' || name === '..') {
    throw new PathError('Enter a name for the entry.', 'invalid-path');
  }
  if (name.length > MAX_NAME_LENGTH) {
    throw new PathError('The name is too long for this file system.', 'invalid-path');
  }
}

function assertParentDirectory(absolute, parentRel) {
  const parent = path.dirname(absolute);
  let stats;
  try {
    stats = fs.statSync(parent);
  } catch {
    throw new PathError(`The folder ${displayFolder(parentRel)} does not exist.`, 'io');
  }
  if (!stats.isDirectory()) {
    throw new PathError(`The folder ${displayFolder(parentRel)} is not a directory.`, 'io');
  }
}

function pathExists(absolute) {
  try {
    fs.lstatSync(absolute);
    return true;
  } catch (error) {
    if (error && (error.code === 'ENOENT' || error.code === 'ENOTDIR')) return false;
    return true;
  }
}

function existingKind(absolute, fallback) {
  try {
    return fs.lstatSync(absolute).isDirectory() ? 'dir' : 'file';
  } catch {
    return fallback;
  }
}

function isInsideDirectory(parent, candidate) {
  const relative = path.relative(parent, candidate);
  if (relative === '') return false;
  if (path.isAbsolute(relative)) return false;
  return relative.split(path.sep)[0] !== '..';
}

function sameEntry(left, right) {
  try {
    const a = fs.statSync(left);
    const b = fs.statSync(right);
    if (a.ino === 0 || b.ino === 0) return false;
    return a.dev === b.dev && a.ino === b.ino;
  } catch {
    return false;
  }
}

function createFile(rootAbs, relPath) {
  let absolute = '';
  let normalized = '';
  try {
    normalized = normalizeRelative(relPath);
    if (normalized === '') return failure('Enter a name for the new file.');
    absolute = resolveInWorkspace(rootAbs, normalized);
    assertEntryName(absolute);
    const parentRel = parentRelative(normalized);
    assertParentDirectory(absolute, parentRel);

    if (pathExists(absolute)) {
      return failure(collisionMessage(existingKind(absolute, 'file'), entryNameLabel(absolute), parentRel));
    }

    fs.writeFileSync(absolute, '', { flag: 'wx' });
    return success();
  } catch (error) {
    if (error && error.code === 'EEXIST') {
      return failure(collisionMessage(existingKind(absolute, 'file'), entryNameLabel(absolute), parentRelative(normalized)));
    }
    return failure(errorMessage(error, `The file ${String(relPath)} could not be created.`));
  }
}

function createDir(rootAbs, relPath) {
  let absolute = '';
  let normalized = '';
  try {
    normalized = normalizeRelative(relPath);
    if (normalized === '') return failure('Enter a name for the new folder.');
    absolute = resolveInWorkspace(rootAbs, normalized);
    assertEntryName(absolute);
    const parentRel = parentRelative(normalized);
    assertParentDirectory(absolute, parentRel);

    if (pathExists(absolute)) {
      return failure(collisionMessage(existingKind(absolute, 'dir'), entryNameLabel(absolute), parentRel));
    }

    fs.mkdirSync(absolute);
    return success();
  } catch (error) {
    if (error && error.code === 'EEXIST') {
      return failure(collisionMessage(existingKind(absolute, 'dir'), entryNameLabel(absolute), parentRelative(normalized)));
    }
    return failure(errorMessage(error, `The folder ${String(relPath)} could not be created.`));
  }
}

function renameEntry(rootAbs, fromRel, toRel) {
  let fromAbs = '';
  let toAbs = '';
  let toNormalized = '';
  try {
    const fromNormalized = normalizeRelative(fromRel);
    toNormalized = normalizeRelative(toRel);

    if (fromNormalized === '') return failure('The workspace folder itself cannot be renamed.');
    if (toNormalized === '') return failure('Enter a new name for the entry.');

    fromAbs = resolveInWorkspace(rootAbs, fromNormalized);
    toAbs = resolveInWorkspace(rootAbs, toNormalized);
    assertEntryName(toAbs);

    const fromParent = parentRelative(fromNormalized);
    const toParent = parentRelative(toNormalized);

    if (!pathExists(fromAbs)) {
      return failure(`The entry ${fromNormalized} no longer exists.`);
    }
    if (fromAbs === toAbs) return success();
    if (isInsideDirectory(fromAbs, toAbs)) {
      return failure('A folder cannot be moved into itself.');
    }

    assertParentDirectory(toAbs, toParent);

    const targetExists = pathExists(toAbs);
    if (targetExists && !sameEntry(fromAbs, toAbs)) {
      return failure(renameCollisionMessage(entryNameLabel(toAbs), toParent));
    }

    fs.renameSync(fromAbs, toAbs);
    return success();
  } catch (error) {
    if (error && (error.code === 'EEXIST' || error.code === 'ENOTEMPTY')) {
      return failure(renameCollisionMessage(entryNameLabel(toAbs), parentRelative(toNormalized)));
    }
    return failure(errorMessage(error, `The entry ${String(fromRel)} could not be renamed.`));
  }
}

function removeEntry(rootAbs, relPath) {
  try {
    const normalized = normalizeRelative(relPath);
    if (normalized === '') return failure('The workspace folder itself cannot be deleted.');

    const rootReal = assertRoot(rootAbs);
    const absolute = resolveInWorkspace(rootAbs, normalized);
    if (absolute === rootReal) {
      return failure('The workspace folder itself cannot be deleted.');
    }

    let stats;
    try {
      stats = fs.lstatSync(absolute);
    } catch (error) {
      if (error && (error.code === 'ENOENT' || error.code === 'ENOTDIR')) {
        return failure(`The entry ${normalized} no longer exists.`);
      }
      throw error;
    }

    if (stats.isDirectory()) {
      fs.rmSync(absolute, { recursive: true, force: false });
    } else {
      fs.unlinkSync(absolute);
    }
    return success();
  } catch (error) {
    return failure(errorMessage(error, `The entry ${String(relPath)} could not be deleted.`));
  }
}

module.exports = {
  createFile,
  createDir,
  renameEntry,
  removeEntry,
};
