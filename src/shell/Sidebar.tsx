import { COMMAND_IDS } from '../commands/ids';
import { hasCommand, runCommand } from '../commands/registry';
import { useAppStore } from '../state/store';
import { Icon } from '../ui/Icon';
import { IconButton } from '../ui/IconButton';
import { ExplorerView } from '../views/ExplorerView';
import { SearchView } from '../views/SearchView';
import { SettingsView } from '../views/SettingsView';

const VIEW_TITLES = {
  explorer: 'Explorer',
  search: 'Search',
  settings: 'Settings',
} as const;

export function Sidebar() {
  const state = useAppStore();
  const view = state.sidebarView;

  return (
    <aside className="sidebar" aria-label={VIEW_TITLES[view]} data-od-id="explorer-panel" data-testid="sidebar">
      <div className="sidebar-head">
        <span className="eyebrow">{VIEW_TITLES[view]}</span>
        <div className="sidebar-actions">
          {view === 'explorer' ? (
            <IconButton
              label="Refresh explorer"
              size="sm"
              disabled={!state.workspace.root || !hasCommand(COMMAND_IDS.refreshWorkspace)}
              onClick={() => {
                void runCommand(COMMAND_IDS.refreshWorkspace);
              }}
            >
              <Icon name="refresh" size="sm" />
            </IconButton>
          ) : null}
        </div>
      </div>

      {view === 'explorer' ? <ExplorerView /> : null}
      {view === 'search' ? <SearchView /> : null}
      {view === 'settings' ? <SettingsView /> : null}
    </aside>
  );
}
