import type { Tab, TabsState } from './types';

export type TabsAction =
  | { type: 'tabs/open'; tab: Tab }
  | { type: 'tabs/focus'; id: string }
  | { type: 'tabs/close'; id: string }
  | { type: 'tabs/dirty'; id: string; dirty: boolean }
  | { type: 'tabs/restore'; tabs: Tab[] };

function withoutDirty(dirty: Record<string, boolean>, id: string): Record<string, boolean> {
  if (!dirty[id]) return dirty;
  const next = { ...dirty };
  delete next[id];
  return next;
}

export function tabsReducer(state: TabsState, action: TabsAction): TabsState {
  switch (action.type) {
    case 'tabs/open': {
      const existing = state.tabs.find((tab) => tab.relPath === action.tab.relPath);
      if (existing) {
        return { ...state, activeId: existing.id };
      }
      return {
        tabs: [...state.tabs, action.tab],
        activeId: action.tab.id,
        dirty: { ...state.dirty },
      };
    }
    case 'tabs/focus': {
      if (!state.tabs.some((tab) => tab.id === action.id)) return state;
      if (state.activeId === action.id) return state;
      return { ...state, activeId: action.id };
    }
    case 'tabs/close': {
      const index = state.tabs.findIndex((tab) => tab.id === action.id);
      if (index === -1) return state;
      const tabs = state.tabs.filter((tab) => tab.id !== action.id);
      let activeId = state.activeId;
      if (state.activeId === action.id) {
        const next = tabs[index] ?? tabs[index - 1] ?? null;
        activeId = next ? next.id : null;
      }
      return { ...state, tabs, activeId, dirty: withoutDirty(state.dirty, action.id) };
    }
    case 'tabs/dirty': {
      if (!state.tabs.some((tab) => tab.id === action.id)) return state;
      if (Boolean(state.dirty[action.id]) === action.dirty) return state;
      if (!action.dirty) {
        return { ...state, dirty: withoutDirty(state.dirty, action.id) };
      }
      return { ...state, dirty: { ...state.dirty, [action.id]: true } };
    }
    case 'tabs/restore': {
      return {
        tabs: [...action.tabs],
        activeId: action.tabs.length > 0 ? action.tabs[0].id : null,
        dirty: {},
      };
    }
    default:
      return state;
  }
}
