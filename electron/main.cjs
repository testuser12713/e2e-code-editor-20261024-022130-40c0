'use strict';

const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { app, BrowserWindow, ipcMain, shell } = require('electron');

const menu = require('./menu.cjs');
const workspaceHandlers = require('./handlers/workspace.cjs');
const filesHandlers = require('./handlers/files.cjs');
const manageHandlers = require('./handlers/manage.cjs');
const searchHandlers = require('./handlers/search.cjs');
const persistHandlers = require('./handlers/persist.cjs');
const quickOpenHandlers = require('./handlers/quickopen.cjs');
const lifecycleHandlers = require('./handlers/lifecycle.cjs');

const INDEX_PATH = path.join(__dirname, '..', 'dist', 'index.html');
const INDEX_URL = pathToFileURL(INDEX_PATH).href;

let mainWindow = null;

function isExternalUrl(candidate) {
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function isLocalFile(candidate) {
  return candidate === INDEX_URL
    || candidate.startsWith(`${INDEX_URL}#`)
    || candidate.startsWith(`${INDEX_URL}?`);
}

function hardenWebContents(contents) {
  contents.setWindowOpenHandler(({ url }) => {
    if (isExternalUrl(url)) {
      setImmediate(() => {
        shell.openExternal(url);
      });
    }
    return { action: 'deny' };
  });

  contents.on('will-navigate', (event, url) => {
    if (!isLocalFile(url)) {
      event.preventDefault();
    }
  });

  contents.on('will-redirect', (event, url) => {
    if (!isLocalFile(url)) {
      event.preventDefault();
    }
  });

  contents.on('will-attach-webview', (event) => {
    event.preventDefault();
  });
}

const invokeHandlers = {
  'workspace:openDialog': workspaceHandlers.openDialog,
  'workspace:openFolder': workspaceHandlers.openFolder,
  'workspace:getRoot': workspaceHandlers.getRoot,
  'workspace:listDir': workspaceHandlers.listDir,
  'files:read': filesHandlers.read,
  'files:write': filesHandlers.write,
  'manage:create': manageHandlers.create,
  'manage:rename': manageHandlers.rename,
  'manage:remove': manageHandlers.remove,
  'quickopen:listFiles': quickOpenHandlers.listFiles,
  'search:run': searchHandlers.run,
  'search:cancel': searchHandlers.cancel,
  'persist:loadSettings': persistHandlers.loadSettings,
  'persist:saveSettings': persistHandlers.saveSettings,
  'persist:loadSession': persistHandlers.loadSession,
  'persist:saveSession': persistHandlers.saveSession,
  'persist:loadRecentFolders': persistHandlers.loadRecentFolders,
  'persist:addRecentFolder': persistHandlers.addRecentFolder,
  'persist:clearLocalData': persistHandlers.clearLocalData,
  'persist:userDataPath': persistHandlers.userDataPath,
  'app:confirmClose': lifecycleHandlers.confirmClose,
};

function registerIpc() {
  for (const [channel, handler] of Object.entries(invokeHandlers)) {
    ipcMain.handle(channel, (event, ...args) => handler(...args));
  }

  ipcMain.handle('app:openExternal', async (event, url) => {
    void event;
    if (typeof url !== 'string' || !isExternalUrl(url)) {
      throw new Error('Only http(s) URLs can be opened externally.');
    }
    await shell.openExternal(url);
  });

  ipcMain.on('menu:setMenuState', (event, state) => {
    void event;
    menu.setMenuState(state);
  });
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 800,
    minHeight: 520,
    show: false,
    backgroundColor: '#101317',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  mainWindow = window;

  window.once('ready-to-show', () => {
    window.show();
  });

  window.on('closed', () => {
    if (mainWindow === window) mainWindow = null;
  });

  window.loadFile(INDEX_PATH);
}

app.on('web-contents-created', (event, contents) => {
  void event;
  hardenWebContents(contents);
});

app.whenReady().then(() => {
  menu.installMenu(() => ({ hasWorkspace: false, hasDocument: false, canSave: false, hasDirtyTabs: false }));
  registerIpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

module.exports = { INDEX_PATH, INDEX_URL };
