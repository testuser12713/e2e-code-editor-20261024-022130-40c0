'use strict';

const NOT_IMPLEMENTED = Object.freeze({ ok: false, message: 'Not implemented' });

function notImplemented() {
  return Promise.resolve(NOT_IMPLEMENTED);
}

async function run(query, searchId) {
  void query;
  void searchId;
  return notImplemented();
}

async function cancel(searchId) {
  void searchId;
  return notImplemented();
}

module.exports = { run, cancel, NOT_IMPLEMENTED };
