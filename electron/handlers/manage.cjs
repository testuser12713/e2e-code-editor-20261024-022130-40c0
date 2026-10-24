'use strict';

const NOT_IMPLEMENTED = Object.freeze({ ok: false, message: 'Not implemented' });

function notImplemented() {
  return Promise.resolve(NOT_IMPLEMENTED);
}

async function create(relPath, kind) {
  void relPath;
  void kind;
  return notImplemented();
}

async function rename(fromRel, toRel) {
  void fromRel;
  void toRel;
  return notImplemented();
}

async function remove(relPath) {
  void relPath;
  return notImplemented();
}

module.exports = { create, rename, remove, NOT_IMPLEMENTED };
