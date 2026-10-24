import { appStore, type AppStore } from './store';

export function initCloseFlow(store: AppStore): void {
  void store;
}

export async function requestCloseTab(tabId: string): Promise<boolean> {
  return !appStore.getState().tabs.dirty[tabId];
}

export async function requestCloseWindow(): Promise<boolean> {
  const dirtyTabs = Object.values(appStore.getState().tabs.dirty).some(Boolean);
  if (dirtyTabs) return false;
  if (typeof window !== 'undefined') window.close();
  return true;
}
