'use strict';

const NOT_IMPLEMENTED = Object.freeze({ ok: false, message: 'Not implemented' });

function notImplemented() {
  return Promise.resolve(NOT_IMPLEMENTED);
}

async function loadSettings() {
  return notImplemented();
}

async function saveSettings(settings) {
  void settings;
  return notImplemented();
}

async function loadSession() {
  return notImplemented();
}

async function saveSession(session) {
  void session;
  return notImplemented();
}

async function loadRecentFolders() {
  return notImplemented();
}

async function addRecentFolder(absPath) {
  void absPath;
  return notImplemented();
}

async function clearLocalData() {
  return notImplemented();
}

async function userDataPath() {
  return notImplemented();
}

module.exports = {
  loadSettings,
  saveSettings,
  loadSession,
  saveSession,
  loadRecentFolders,
  addRecentFolder,
  clearLocalData,
  userDataPath,
  NOT_IMPLEMENTED,
};
