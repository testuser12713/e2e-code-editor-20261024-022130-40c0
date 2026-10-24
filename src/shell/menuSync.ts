import { runCommand } from '../commands/registry';
import { platform } from '../platform';
import type { MenuState } from '../state/types';

type MenuSyncStore = {
  getState: () => {
    workspace: { root: string | null };
    tabs: { activeId: string | null; dirty: Record<string, boolean> };
    status: { relPath: string | null };
  };
  subscribe: (listener: () => void) => () => void;
};

export function menuStateFor(store: MenuSyncStore): MenuState {
  const state = store.getState();
  return {
    hasWorkspace: state.workspace.root !== null,
    hasDocument: state.status.relPath !== null,
    canSave: state.tabs.activeId !== null,
    hasDirtyTabs: Object.values(state.tabs.dirty).some(Boolean),
  };
}

export function initMenuSync(store: MenuSyncStore): () => void {
  const pushState = () => {
    platform.menu.setMenuState(menuStateFor(store));
  };

  pushState();
  const unsubscribeStore = store.subscribe(pushState);
  const unsubscribeMenu = platform.menu.onCommand((commandId) => {
    void runCommand(commandId);
  });

  return () => {
    unsubscribeStore();
    unsubscribeMenu();
  };
}
