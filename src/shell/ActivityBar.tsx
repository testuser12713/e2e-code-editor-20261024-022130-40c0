import { COMMAND_IDS } from '../commands/ids';
import { hasCommand, runCommand } from '../commands/registry';
import { useAppStore } from '../state/store';
import { Icon } from '../ui/Icon';

export function ActivityBar() {
  const state = useAppStore();
  const view = state.sidebarView;

  const switchView = (commandId: string) => {
    void runCommand(commandId);
  };

  return (
    <nav className="activitybar" aria-label="Primary views" data-od-id="activity-bar" data-testid="activity-bar">
      <button
        type="button"
        className="activity-btn"
        aria-current={view === 'explorer' ? 'page' : undefined}
        title="Explorer"
        aria-label="Explorer"
        data-testid="activity-explorer"
        onClick={() => switchView(COMMAND_IDS.showExplorer)}
      >
        <Icon name="folder" size="lg" />
      </button>
      <button
        type="button"
        className="activity-btn"
        aria-current={view === 'search' ? 'page' : undefined}
        title="Project search"
        aria-label="Project search"
        data-testid="activity-search"
        onClick={() => switchView(COMMAND_IDS.showSearch)}
      >
        <Icon name="search" size="lg" />
      </button>
      <button
        type="button"
        className="activity-btn"
        aria-current={view === 'settings' ? 'page' : undefined}
        title="Settings"
        aria-label="Settings"
        data-testid="activity-settings"
        onClick={() => switchView(COMMAND_IDS.showSettings)}
      >
        <Icon name="settings" size="lg" />
      </button>
      <span className="activity-spacer" />
      <span className="activity-sep" />
      <button
        type="button"
        className="activity-btn"
        title="About / Privacy"
        aria-label="About and privacy"
        aria-disabled={!hasCommand(COMMAND_IDS.about)}
        disabled={!hasCommand(COMMAND_IDS.about)}
        data-testid="activity-about"
        onClick={() => {
          void runCommand(COMMAND_IDS.about);
        }}
      >
        <Icon name="info" />
      </button>
    </nav>
  );
}
