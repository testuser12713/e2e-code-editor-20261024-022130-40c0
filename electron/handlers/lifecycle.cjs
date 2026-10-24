'use strict';

const NOT_IMPLEMENTED = Object.freeze({ ok: false, message: 'Not implemented' });

function notImplemented() {
  return Promise.resolve(NOT_IMPLEMENTED);
}

async function confirmClose() {
  return notImplemented();
}

module.exports = { confirmClose, NOT_IMPLEMENTED };
