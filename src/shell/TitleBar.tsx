import { COMMAND_IDS } from '../commands/ids';
import { hasCommand, runCommand } from '../commands/registry';
import { requestCloseWindow } from '../state/closeFlow';
import { useAppStore } from '../state/store';
import { Icon } from '../ui/Icon';
import { Menu, type MenuEntry } from '../ui/Menu';

export function TitleBar() {
  const state = useAppStore();
  const activeTab = state.tabs.tabs.find((tab) => tab.id === state.tabs.activeId) ?? null;
  const root = state.workspace.root;

  const commandAction = (id: string, args?: unknown) => {
    if (!hasCommand(id)) return undefined;
    return () => {
      void runCommand(id, args);
    };
  };

  const fileMenu: MenuEntry[] = [
    {
      label: 'Open Folder…',
      keybinding: 'Ctrl+Shift+O',
      onSelect: commandAction(COMMAND_IDS.openFolder),
    },
    { label: 'Open Recent', disabled: true },
    { separator: true },
    {
      label: 'Save',
      keybinding: 'Ctrl+S',
      icon: 'save',
      onSelect: commandAction(COMMAND_IDS.save),
    },
    {
      label: 'Save All',
      keybinding: 'Ctrl+Alt+S',
      icon: 'save',
      onSelect: commandAction(COMMAND_IDS.saveAll),
    },
    {
      label: 'Close Tab',
      icon: 'close',
      onSelect: activeTab ? commandAction(COMMAND_IDS.closeTab, { tabId: activeTab.id }) : undefined,
    },
    { separator: true },
    {
      label: 'Settings',
      keybinding: 'Ctrl+,',
      icon: 'settings',
      onSelect: commandAction(COMMAND_IDS.showSettings),
    },
    {
      label: 'Exit',
      onSelect: () => {
        void requestCloseWindow();
      },
    },
  ];

  const editMenu: MenuEntry[] = [
    {
      label: 'Find',
      keybinding: 'Ctrl+F',
      icon: 'search',
      onSelect: commandAction(COMMAND_IDS.find),
    },
    {
      label: 'Replace',
      keybinding: 'Ctrl+H',
      icon: 'edit',
      onSelect: commandAction(COMMAND_IDS.replace),
    },
    { separator: true },
    { label: 'Undo', keybinding: 'Ctrl+Z', disabled: true },
    { label: 'Redo', keybinding: 'Ctrl+Y', disabled: true },
  ];

  const viewMenu: MenuEntry[] = [
    {
      label: 'Explorer',
      keybinding: 'Ctrl+Shift+E',
      icon: 'folder',
      onSelect: commandAction(COMMAND_IDS.showExplorer),
    },
    {
      label: 'Search',
      keybinding: 'Ctrl+Shift+F',
      icon: 'search',
      onSelect: commandAction(COMMAND_IDS.projectSearch),
    },
    {
      label: 'Command Palette',
      keybinding: 'Ctrl+Shift+P',
      icon: 'command',
      onSelect: commandAction(COMMAND_IDS.commandPalette),
    },
    { separator: true },
    {
      label: 'Settings',
      keybinding: 'Ctrl+,',
      icon: 'settings',
      onSelect: commandAction(COMMAND_IDS.showSettings),
    },
  ];

  const helpMenu: MenuEntry[] = [
    {
      label: 'About / Privacy',
      icon: 'info',
      onSelect: commandAction(COMMAND_IDS.about),
    },
    {
      label: 'Reset Local Data',
      icon: 'trash',
      danger: true,
      onSelect: commandAction(COMMAND_IDS.resetLocalData),
    },
  ];

  return (
    <header className="titlebar" data-od-id="titlebar" data-testid="title-bar">
      <button
        type="button"
        className="brand"
        aria-label="Forge home"
        onClick={() => {
          void runCommand(COMMAND_IDS.showExplorer);
        }}
      >
        <span className="brand-mark">
          <Icon name="brand" />
        </span>
        <span className="brand-name">Forge</span>
      </button>

      <nav className="menubar" aria-label="Application menu">
        <Menu label="File" items={fileMenu} testId="menu-file" />
        <Menu label="Edit" items={editMenu} testId="menu-edit" />
        <Menu label="View" items={viewMenu} testId="menu-view" />
        <Menu label="Help" items={helpMenu} testId="menu-help" />
      </nav>

      <div className="titlebar-context">
        <Icon name={root ? 'folder' : 'folder-open'} size="sm" />
        <span className={root ? 'path' : undefined}>{root ?? 'No folder open'}</span>
      </div>

      <div className="titlebar-actions">
        <button
          type="button"
          className="command-hint"
          aria-label="Open command palette"
          disabled={!hasCommand(COMMAND_IDS.commandPalette)}
          onClick={() => {
            void runCommand(COMMAND_IDS.commandPalette);
          }}
        >
          <Icon name="command" size="sm" />
          <span>Commands</span>
          <span className="kbd">Ctrl+Shift+P</span>
        </button>
      </div>
    </header>
  );
}
