'use strict';

const { app, BrowserWindow } = require('electron');

let allowClose = false;
let pendingWindow = null;

function sendBeforeClose(window) {
  if (!window || window.isDestroyed() || window.webContents.isDestroyed()) return false;
  pendingWindow = window;
  window.webContents.send('app:beforeClose');
  return true;
}

function attachCloseGuard(window) {
  window.on('close', (event) => {
    if (allowClose) return;
    event.preventDefault();
    sendBeforeClose(window);
  });
}

function targetWindow() {
  if (pendingWindow && !pendingWindow.isDestroyed()) return pendingWindow;
  return BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0] || null;
}

function confirmClose() {
  const window = targetWindow();
  pendingWindow = null;

  if (!window) {
    allowClose = true;
    app.quit();
    return { ok: true };
  }

  allowClose = true;
  window.close();
  return { ok: true };
}

app.on('browser-window-created', (_event, window) => {
  attachCloseGuard(window);
});

app.on('before-quit', (event) => {
  if (allowClose) return;

  const window = targetWindow();
  if (!window) {
    allowClose = true;
    return;
  }

  event.preventDefault();
  sendBeforeClose(window);
});

module.exports = { confirmClose };
