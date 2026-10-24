import { COMMAND_IDS } from '../commands/ids';
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
  let pushed: MenuState | null = null;

  const pushState = () => {
    const next = menuStateFor(store);
    if (
      pushed
      && pushed.hasWorkspace === next.hasWorkspace
      && pushed.hasDocument === next.hasDocument
      && pushed.canSave === next.canSave
      && pushed.hasDirtyTabs === next.hasDirtyTabs
    ) {
      return;
    }
    pushed = next;
    platform.menu.setMenuState(next);
  };

  pushState();
  const unsubscribeStore = store.subscribe(pushState);
  const unsubscribeMenu = platform.menu.onCommand((commandId) => {
    if (commandId === COMMAND_IDS.closeTab) {
      const tabId = store.getState().tabs.activeId;
      if (!tabId) return;
      void runCommand(commandId, { tabId });
      return;
    }
    void runCommand(commandId);
  });

  return () => {
    unsubscribeStore();
    unsubscribeMenu();
  };
}
