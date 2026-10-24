'use strict';

const NOT_IMPLEMENTED = Object.freeze({ ok: false, message: 'Not implemented' });

function notImplemented() {
  return Promise.resolve(NOT_IMPLEMENTED);
}

async function openDialog() {
  return notImplemented();
}

async function openFolder(absPath) {
  void absPath;
  return notImplemented();
}

async function getRoot() {
  return notImplemented();
}

async function listDir(relPath) {
  void relPath;
  return notImplemented();
}

module.exports = { openDialog, openFolder, getRoot, listDir, NOT_IMPLEMENTED };
