'use strict';

const fileOps = require('../lib/fileOps.cjs');
const { PathError } = require('../lib/pathGuard.cjs');
const workspace = require('./workspace.cjs');

const MAX_PATH_LENGTH = 4096;

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

async function requireRoot() {
  const root = await workspace.getRoot();
  if (typeof root !== 'string' || root.length === 0) {
    throw new PathError('No workspace folder is open.', 'io');
  }
  return root;
}

async function withRoot(operation, fallback) {
  try {
    const root = await requireRoot();
    return operation(root);
  } catch (error) {
    return failure(errorMessage(error, fallback));
  }
}

async function create(relPath, kind) {
  if (!isPathArgument(relPath)) {
    return failure('A file path is required.');
  }
  if (kind !== 'file' && kind !== 'dir') {
    return failure('The entry kind must be either "file" or "dir".');
  }

  return withRoot(
    (root) => (kind === 'file' ? fileOps.createFile(root, relPath) : fileOps.createDir(root, relPath)),
    `The entry ${relPath} could not be created.`,
  );
}

async function rename(fromRel, toRel) {
  if (!isPathArgument(fromRel)) {
    return failure('The path of the entry to rename is required.');
  }
  if (!isPathArgument(toRel)) {
    return failure('The new name for the entry is required.');
  }

  return withRoot(
    (root) => fileOps.renameEntry(root, fromRel, toRel),
    `The entry ${fromRel} could not be renamed.`,
  );
}

async function remove(relPath) {
  if (!isPathArgument(relPath)) {
    return failure('The path of the entry to delete is required.');
  }

  return withRoot(
    (root) => fileOps.removeEntry(root, relPath),
    `The entry ${relPath} could not be deleted.`,
  );
}

module.exports = { create, rename, remove };
