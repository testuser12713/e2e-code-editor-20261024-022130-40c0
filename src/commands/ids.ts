export const COMMAND_IDS = {
  showExplorer: 'view.showExplorer',
  showSearch: 'view.showSearch',
  showSettings: 'view.showSettings',
  openFolder: 'workspace.openFolder',
  openPath: 'workspace.openPath',
  refreshWorkspace: 'workspace.refresh',
  openFile: 'file.open',
  save: 'file.save',
  saveAll: 'file.saveAll',
  closeTab: 'file.closeTab',
  find: 'editor.find',
  replace: 'editor.replace',
  quickOpen: 'file.quickOpen',
  projectSearch: 'search.project',
  commandPalette: 'view.commandPalette',
  newFile: 'tree.newFile',
  newFolder: 'tree.newFolder',
  rename: 'tree.rename',
  delete: 'tree.delete',
  about: 'app.about',
  resetLocalData: 'app.resetLocalData',
} as const;

export type CommandId = (typeof COMMAND_IDS)[keyof typeof COMMAND_IDS];

export const COMMAND_KEYBINDINGS: Record<string, string> = {
  [COMMAND_IDS.showExplorer]: 'Ctrl+Shift+E',
  [COMMAND_IDS.showSettings]: 'Ctrl+,',
  [COMMAND_IDS.save]: 'Ctrl+S',
  [COMMAND_IDS.saveAll]: 'Ctrl+Alt+S',
  [COMMAND_IDS.quickOpen]: 'Ctrl+P',
  [COMMAND_IDS.projectSearch]: 'Ctrl+Shift+F',
  [COMMAND_IDS.commandPalette]: 'Ctrl+Shift+P',
  [COMMAND_IDS.find]: 'Ctrl+F',
  [COMMAND_IDS.replace]: 'Ctrl+H',
  [COMMAND_IDS.openFolder]: 'Ctrl+Shift+O',
};
