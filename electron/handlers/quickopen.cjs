'use strict';

const NOT_IMPLEMENTED = Object.freeze({ ok: false, message: 'Not implemented' });

function notImplemented() {
  return Promise.resolve(NOT_IMPLEMENTED);
}

async function listFiles() {
  return notImplemented();
}

module.exports = { listFiles, NOT_IMPLEMENTED };
