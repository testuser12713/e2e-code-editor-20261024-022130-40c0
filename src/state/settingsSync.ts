import type { AppState } from './types';

export type SettingsSyncStore = {
  getState: () => AppState;
  subscribe: (listener: () => void) => () => void;
};

export function initSettingsSync(store: SettingsSyncStore): () => void {
  void store;
  return () => undefined;
}
