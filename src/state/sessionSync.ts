import type { AppState } from './types';

export type SessionSyncStore = {
  getState: () => AppState;
  subscribe: (listener: () => void) => () => void;
};

export function initSessionSync(store: SessionSyncStore): () => void {
  void store;
  return () => undefined;
}
