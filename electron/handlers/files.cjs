'use strict';

const NOT_IMPLEMENTED = Object.freeze({ ok: false, message: 'Not implemented' });

function notImplemented() {
  return Promise.resolve(NOT_IMPLEMENTED);
}

async function read(relPath) {
  void relPath;
  return notImplemented();
}

async function write(relPath, content, eol) {
  void relPath;
  void content;
  void eol;
  return notImplemented();
}

module.exports = { read, write, NOT_IMPLEMENTED };
