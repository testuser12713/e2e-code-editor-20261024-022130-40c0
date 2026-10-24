import { useSyncExternalStore } from 'react';

import { settingsReducer, type SettingsAction } from './settingsReducer';
import { tabsReducer, type TabsAction } from './tabsReducer';
import type { AppState, DocumentStatus, Settings } from './types';
import { workspaceReducer, type WorkspaceAction } from './workspaceReducer';

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  fontSize: 14,
  tabSize: 2,
  wordWrap: false,
  renderWhitespace: false,
  treeFontSize: 13,
};

export const DEFAULT_STATUS: DocumentStatus = {
  relPath: null,
  language: 'Plain Text',
  line: 1,
  column: 1,
  indentMode: 'spaces',
  indentSize: 2,
  eol: 'lf',
  encoding: 'utf-8',
};

export const INITIAL_STATE: AppState = {
  settings: { ...DEFAULT_SETTINGS },
  workspace: {
    root: null,
    listings: {},
    expanded: {},
  },
  tabs: {
    tabs: [],
    activeId: null,
    dirty: {},
  },
  status: { ...DEFAULT_STATUS },
  sidebarView: 'explorer',
};

export type ShellAction =
  | { type: 'view/showExplorer' }
  | { type: 'view/showSearch' }
  | { type: 'view/showSettings' };

export type StatusAction =
  | { type: 'status/update'; status: Partial<DocumentStatus> }
  | { type: 'status/reset' };

export type AppAction = TabsAction | WorkspaceAction | SettingsAction | ShellAction | StatusAction;

function shellReducer(state: AppState, action: ShellAction): AppState {
  switch (action.type) {
    case 'view/showExplorer':
      return { ...state, sidebarView: 'explorer' };
    case 'view/showSearch':
      return { ...state, sidebarView: 'search' };
    case 'view/showSettings':
      return { ...state, sidebarView: 'settings' };
    default:
      return state;
  }
}

function reduce(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'view/showExplorer':
    case 'view/showSearch':
    case 'view/showSettings':
      return shellReducer(state, action);
    case 'tabs/open':
    case 'tabs/focus':
    case 'tabs/close':
    case 'tabs/dirty':
    case 'tabs/restore':
      return { ...state, tabs: tabsReducer(state.tabs, action) };
    case 'workspace/open':
    case 'workspace/close':
    case 'workspace/list':
    case 'workspace/toggle':
    case 'workspace/reload':
      return { ...state, workspace: workspaceReducer(state.workspace, action) };
    case 'settings/update':
    case 'settings/replace':
      return { ...state, settings: settingsReducer(state.settings, action) };
    case 'status/update':
      return { ...state, status: { ...state.status, ...action.status } };
    case 'status/reset':
      return {
        ...state,
        status: { ...DEFAULT_STATUS, indentSize: state.settings.tabSize },
      };
    default:
      return state;
  }
}

function createStore(initialState: AppState) {
  let state = initialState;
  const listeners = new Set<() => void>();

  return {
    getState: (): AppState => state,
    dispatch: (action: AppAction): void => {
      const next = reduce(state, action);
      if (next === state) return;
      state = next;
      for (const listener of listeners) listener();
    },
    subscribe: (listener: () => void): (() => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export const appStore = createStore(INITIAL_STATE);

export function useAppStore(): AppState {
  return useSyncExternalStore(appStore.subscribe, appStore.getState, appStore.getState);
}

export type AppStore = typeof appStore;
