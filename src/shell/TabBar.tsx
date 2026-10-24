import { COMMAND_IDS, COMMAND_KEYBINDINGS } from '../commands/ids';
import { hasCommand, registerCommands, runCommand } from '../commands/registry';
import { requestCloseTab } from '../state/closeFlow';
import { closeTabById, openFile } from '../state/documents';
import { useAppStore } from '../state/store';
import { Icon } from '../ui/Icon';
import { IconButton } from '../ui/IconButton';
import { TabChip } from '../ui/TabChip';

function closeRequestedTab(tabId: string): Promise<boolean> {
  return requestCloseTab(tabId).then((confirmed) => {
    if (confirmed) closeTabById(tabId);
    return confirmed;
  });
}

registerCommands([
  {
    id: COMMAND_IDS.closeTab,
    title: 'File: Close Tab',
    keybinding: COMMAND_KEYBINDINGS[COMMAND_IDS.closeTab],
    run: (args) => {
      const tabId = args && typeof args === 'object'
        ? (args as { tabId?: unknown }).tabId
        : undefined;
      if (typeof tabId !== 'string' || tabId.length === 0) return false;
      return closeRequestedTab(tabId);
    },
  },
]);

export function TabBar() {
  const state = useAppStore();
  const activeTab = state.tabs.tabs.find((tab) => tab.id === state.tabs.activeId) ?? null;
  const canFind = Boolean(activeTab) && hasCommand(COMMAND_IDS.find);

  return (
    <div
      className="tabbar"
      role="tablist"
      aria-label="Open editors"
      data-od-id="tab-bar"
      data-testid="tab-bar"
    >
      {state.tabs.tabs.map((tab) => (
        <TabChip
          key={tab.id}
          tab={tab}
          active={tab.id === state.tabs.activeId}
          dirty={Boolean(state.tabs.dirty[tab.id])}
          onSelect={(tabId) => {
            const target = state.tabs.tabs.find((candidate) => candidate.id === tabId);
            if (!target) return;
            void openFile(target.relPath);
          }}
          onClose={(tabId) => {
            void closeRequestedTab(tabId);
          }}
        />
      ))}
      <span className="tab-spacer" />
      <div className="tab-actions">
        <IconButton
          label="Find in file"
          size="sm"
          disabled={!canFind}
          testId="tab-find"
          onClick={() => {
            void runCommand(COMMAND_IDS.find);
          }}
        >
          <Icon name="search" size="sm" />
        </IconButton>
      </div>
    </div>
  );
}
