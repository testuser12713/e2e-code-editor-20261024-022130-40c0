'use strict';

const { assertRoot } = require('../lib/pathGuard.cjs');
const { walkFiles } = require('../lib/walkWorkspace.cjs');
const workspace = require('./workspace.cjs');

const MAX_FILES = 20000;

function assertNoArguments(args) {
  if (args.length > 0) {
    throw new TypeError('quickopen:listFiles does not take any arguments.');
  }
}

async function listFiles(...args) {
  assertNoArguments(args);

  const root = await workspace.getRoot();
  if (typeof root !== 'string' || root.length === 0) {
    return [];
  }

  let realRoot;
  try {
    realRoot = assertRoot(root);
  } catch (error) {
    const message = error && typeof error.message === 'string' && error.message.length > 0
      ? error.message
      : 'The workspace folder cannot be read.';
    throw new Error(message);
  }

  return walkFiles(realRoot, { maxFiles: MAX_FILES });
}

module.exports = { listFiles, MAX_FILES };
