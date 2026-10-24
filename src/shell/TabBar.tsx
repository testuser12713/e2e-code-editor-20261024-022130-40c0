import { COMMAND_IDS } from '../commands/ids';
import { hasCommand, runCommand } from '../commands/registry';
import { closeTabById } from '../state/documents';
import { useAppStore } from '../state/store';
import { Icon } from '../ui/Icon';
import { IconButton } from '../ui/IconButton';
import { TabChip } from '../ui/TabChip';

export function TabBar() {
  const state = useAppStore();
  const hasDirtyTabs = Object.values(state.tabs.dirty).some(Boolean);

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
            if (target && hasCommand(COMMAND_IDS.openFile)) {
              void runCommand(COMMAND_IDS.openFile, { relPath: target.relPath });
            }
          }}
          onClose={(tabId) => {
            if (hasCommand(COMMAND_IDS.closeTab)) {
              void runCommand(COMMAND_IDS.closeTab, { tabId });
            } else {
              closeTabById(tabId);
            }
          }}
        />
      ))}
      <span className="tab-spacer" />
      <div className="tab-actions">
        <IconButton
          label="Save all"
          size="sm"
          disabled={!hasDirtyTabs || !hasCommand(COMMAND_IDS.saveAll)}
          onClick={() => {
            void runCommand(COMMAND_IDS.saveAll);
          }}
        >
          <Icon name="save" size="sm" />
        </IconButton>
      </div>
    </div>
  );
}
