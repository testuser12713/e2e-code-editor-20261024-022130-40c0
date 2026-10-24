'use strict';

const UNAVAILABLE = 'Python execution is not available yet.';

async function run(relPath) {
  void relPath;
  return { ok: false, message: UNAVAILABLE };
}

async function stop(runId) {
  void runId;
  return { ok: false, message: UNAVAILABLE };
}

async function check(relPath) {
  void relPath;
  return { ok: false, kind: 'rejected', message: UNAVAILABLE };
}

async function interpreter() {
  return { found: false };
}

module.exports = { run, stop, check, interpreter };
