import type { Tab, TabsState } from './types';

export type TabsAction =
  | { type: 'tabs/open'; tab: Tab }
  | { type: 'tabs/focus'; id: string }
  | { type: 'tabs/close'; id: string }
  | { type: 'tabs/dirty'; id: string; dirty: boolean }
  | { type: 'tabs/restore'; tabs: Tab[] };

export function tabsReducer(state: TabsState, action: TabsAction): TabsState {
  void action;
  return state;
}
