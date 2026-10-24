'use strict';

const RUN_TIMEOUT_MS = 60000;

async function resolveInterpreter() {
  return { found: false };
}

function buildArgs(scriptPath) {
  void scriptPath;
  return [];
}

function buildEnv() {
  return {};
}

function killRunTree(pid) {
  void pid;
}

module.exports = {
  resolveInterpreter,
  buildArgs,
  buildEnv,
  killRunTree,
  RUN_TIMEOUT_MS,
};
