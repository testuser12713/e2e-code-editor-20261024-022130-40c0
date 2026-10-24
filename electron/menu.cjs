'use strict';

const DEFAULT_MENU_STATE = Object.freeze({
  hasWorkspace: false,
  hasDocument: false,
  canSave: false,
  hasDirtyTabs: false,
});

const COMMAND_IDS = Object.freeze({
  openFolder: 'workspace.openFolder',
  save: 'file.save',
  saveAll: 'file.saveAll',
  closeTab: 'file.closeTab',
  showExplorer: 'view.showExplorer',
  showSettings: 'view.showSettings',
  projectSearch: 'search.project',
  commandPalette: 'view.commandPalette',
  find: 'editor.find',
  replace: 'editor.replace',
  about: 'app.about',
  resetLocalData: 'app.resetLocalData',
});

const COMMAND_ACCELERATORS = Object.freeze({
  'workspace.openFolder': 'Ctrl+Shift+O',
  'file.save': 'Ctrl+S',
  'file.saveAll': 'Ctrl+Alt+S',
  'view.showExplorer': 'Ctrl+Shift+E',
  'view.showSettings': 'Ctrl+,',
  'search.project': 'Ctrl+Shift+F',
  'view.commandPalette': 'Ctrl+Shift+P',
  'editor.find': 'Ctrl+F',
  'editor.replace': 'Ctrl+H',
});

let getMenuState = null;
let pushedState = null;

function normalizeMenuState(value) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    hasWorkspace: source.hasWorkspace === true,
    hasDocument: source.hasDocument === true,
    canSave: source.canSave === true,
    hasDirtyTabs: source.hasDirtyTabs === true,
  };
}

function effectiveMenuState() {
  if (pushedState) return pushedState;
  if (typeof getMenuState === 'function') return normalizeMenuState(getMenuState());
  return { ...DEFAULT_MENU_STATE };
}

function isEnabled(commandId, state) {
  switch (commandId) {
    case COMMAND_IDS.save:
      return state.canSave;
    case COMMAND_IDS.saveAll:
      return state.hasDirtyTabs;
    case COMMAND_IDS.closeTab:
    case COMMAND_IDS.find:
    case COMMAND_IDS.replace:
      return state.hasDocument;
    case COMMAND_IDS.projectSearch:
      return state.hasWorkspace;
    default:
      return true;
  }
}

function sendCommand(commandId) {
  const { BrowserWindow } = require('electron');
  const focused = BrowserWindow && typeof BrowserWindow.getFocusedWindow === 'function'
    ? BrowserWindow.getFocusedWindow()
    : null;
  if (!focused || typeof focused.isDestroyed === 'function' && focused.isDestroyed()) return;
  focused.webContents.send('menu:command', commandId);
}

function commandItem(state, commandId, label) {
  const item = {
    id: commandId,
    label,
    enabled: isEnabled(commandId, state),
    click: () => {
      sendCommand(commandId);
    },
  };
  const accelerator = COMMAND_ACCELERATORS[commandId];
  if (accelerator) item.accelerator = accelerator;
  return item;
}

function roleItem(role, label) {
  return { role, label };
}

function buildMenuTemplate(menuState) {
  const state = normalizeMenuState(menuState);

  return [
    {
      label: 'File',
      submenu: [
        commandItem(state, COMMAND_IDS.openFolder, 'Open Folder…'),
        { type: 'separator' },
        commandItem(state, COMMAND_IDS.save, 'Save'),
        commandItem(state, COMMAND_IDS.saveAll, 'Save All'),
        commandItem(state, COMMAND_IDS.closeTab, 'Close Tab'),
        { type: 'separator' },
        commandItem(state, COMMAND_IDS.showSettings, 'Settings'),
        { label: 'Exit', role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        commandItem(state, COMMAND_IDS.find, 'Find'),
        commandItem(state, COMMAND_IDS.replace, 'Replace'),
        { type: 'separator' },
        roleItem('undo', 'Undo'),
        roleItem('redo', 'Redo'),
        { type: 'separator' },
        roleItem('cut', 'Cut'),
        roleItem('copy', 'Copy'),
        roleItem('paste', 'Paste'),
      ],
    },
    {
      label: 'View',
      submenu: [
        commandItem(state, COMMAND_IDS.showExplorer, 'Explorer'),
        commandItem(state, COMMAND_IDS.projectSearch, 'Search'),
        commandItem(state, COMMAND_IDS.commandPalette, 'Command Palette'),
        { type: 'separator' },
        commandItem(state, COMMAND_IDS.showSettings, 'Settings'),
      ],
    },
    {
      label: 'Help',
      submenu: [
        commandItem(state, COMMAND_IDS.about, 'About / Privacy'),
        commandItem(state, COMMAND_IDS.resetLocalData, 'Reset Local Data'),
      ],
    },
  ];
}

function applyMenu() {
  const { Menu } = require('electron');
  if (!Menu || typeof Menu.buildFromTemplate !== 'function') return null;
  const template = buildMenuTemplate(effectiveMenuState());
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  return template;
}

function installMenu(stateProvider) {
  getMenuState = typeof stateProvider === 'function' ? stateProvider : null;
  pushedState = null;
  return applyMenu();
}

function setMenuState(state) {
  pushedState = normalizeMenuState(state);
  return applyMenu();
}

module.exports = {
  DEFAULT_MENU_STATE,
  COMMAND_IDS,
  COMMAND_ACCELERATORS,
  buildMenuTemplate,
  installMenu,
  setMenuState,
};
