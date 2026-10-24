'use strict';

const { contextBridge, ipcRenderer } = require('electron');

const api = {
  workspace: {
    openDialog: () => ipcRenderer.invoke('workspace:openDialog'),
    openFolder: (absPath) => ipcRenderer.invoke('workspace:openFolder', absPath),
    getRoot: () => ipcRenderer.invoke('workspace:getRoot'),
    listDir: (relPath) => ipcRenderer.invoke('workspace:listDir', relPath),
  },
  files: {
    read: (relPath) => ipcRenderer.invoke('files:read', relPath),
    write: (relPath, content, eol) => ipcRenderer.invoke('files:write', relPath, content, eol),
  },
  manage: {
    create: (relPath, kind) => ipcRenderer.invoke('manage:create', relPath, kind),
    rename: (fromRel, toRel) => ipcRenderer.invoke('manage:rename', fromRel, toRel),
    remove: (relPath) => ipcRenderer.invoke('manage:remove', relPath),
  },
  quickOpen: {
    listFiles: () => ipcRenderer.invoke('quickopen:listFiles'),
  },
  search: {
    run: (query, searchId) => ipcRenderer.invoke('search:run', query, searchId),
    cancel: (searchId) => ipcRenderer.invoke('search:cancel', searchId),
  },
  persist: {
    loadSettings: () => ipcRenderer.invoke('persist:loadSettings'),
    saveSettings: (settings) => ipcRenderer.invoke('persist:saveSettings', settings),
    loadSession: () => ipcRenderer.invoke('persist:loadSession'),
    saveSession: (session) => ipcRenderer.invoke('persist:saveSession', session),
    loadRecentFolders: () => ipcRenderer.invoke('persist:loadRecentFolders'),
    addRecentFolder: (absPath) => ipcRenderer.invoke('persist:addRecentFolder', absPath),
    clearLocalData: () => ipcRenderer.invoke('persist:clearLocalData'),
    userDataPath: () => ipcRenderer.invoke('persist:userDataPath'),
  },
  app: {
    openExternal: (url) => ipcRenderer.invoke('app:openExternal', url),
    onBeforeClose: (callback) => {
      const listener = () => callback();
      ipcRenderer.on('app:beforeClose', listener);
      return () => {
        ipcRenderer.removeListener('app:beforeClose', listener);
      };
    },
    confirmClose: () => {
      void ipcRenderer.invoke('app:confirmClose');
    },
  },
  menu: {
    setMenuState: (state) => {
      ipcRenderer.send('menu:setMenuState', state);
    },
    onCommand: (callback) => {
      const listener = (_event, commandId) => callback(commandId);
      ipcRenderer.on('menu:command', listener);
      return () => {
        ipcRenderer.removeListener('menu:command', listener);
      };
    },
  },
};

contextBridge.exposeInMainWorld('api', api);
