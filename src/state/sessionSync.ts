import { COMMAND_IDS } from '../commands/ids';
import { runCommand } from '../commands/registry';
import { platform } from '../platform';
import {
  getDocumentEntry,
  getEditorApi,
  openFile,
  setTabCursor,
} from './documents';
import type { TabsAction } from './tabsReducer';
import type { AppState, SessionState } from './types';

export type SessionSyncStore = {
  getState: () => AppState;
  subscribe: (listener: () => void) => () => void;
  dispatch: (action: TabsAction) => void;
};

const SAVE_DELAY_MS = 250;

type Cursor = { line: number; column: number };

function normalizeCursor(value: unknown): Cursor {
  if (value && typeof value === 'object') {
    const candidate = value as { line?: unknown; column?: unknown };
    const line = typeof candidate.line === 'number' && Number.isInteger(candidate.line) && candidate.line > 0
      ? candidate.line
      : 1;
    const column = typeof candidate.column === 'number' && Number.isInteger(candidate.column) && candidate.column > 0
      ? candidate.column
      : 1;
    return { line, column };
  }
  return { line: 1, column: 1 };
}

function parseSession(value: unknown): SessionState | null {
  if (!value || typeof value !== 'object') return null;

  const record = value as Record<string, unknown>;
  const workspaceRoot = typeof record.workspaceRoot === 'string' && record.workspaceRoot.length > 0
    ? record.workspaceRoot
    : null;

  const tabs: SessionState['tabs'] = [];
  if (Array.isArray(record.tabs)) {
    for (const entry of record.tabs) {
      if (!entry || typeof entry !== 'object') continue;
      const tab = entry as { relPath?: unknown; cursor?: unknown };
      if (typeof tab.relPath !== 'string' || tab.relPath.length === 0) continue;
      tabs.push({ relPath: tab.relPath, cursor: normalizeCursor(tab.cursor) });
    }
  }

  const activeRelPath = typeof record.activeRelPath === 'string'
    && tabs.some((tab) => tab.relPath === record.activeRelPath)
    ? record.activeRelPath
    : null;

  return { workspaceRoot, tabs, activeRelPath };
}

function buildSession(store: SessionSyncStore): SessionState {
  const state = store.getState();
  const active = state.tabs.tabs.find((tab) => tab.id === state.tabs.activeId) ?? null;

  return {
    workspaceRoot: state.workspace.root,
    tabs: state.tabs.tabs.map((tab) => ({
      relPath: tab.relPath,
      cursor: normalizeCursor(getDocumentEntry(tab.id)?.cursor),
    })),
    activeRelPath: active ? active.relPath : null,
  };
}

function signatureFor(state: AppState): string {
  const tabs = state.tabs.tabs.map((tab) => `${tab.id}:${tab.relPath}`).join('|');
  return [
    state.workspace.root ?? '',
    tabs,
    state.tabs.activeId ?? '',
    String(state.status.line),
    String(state.status.column),
  ].join('\n');
}

async function restoreSession(store: SessionSyncStore): Promise<void> {
  let loaded: unknown;
  try {
    loaded = await platform.persist.loadSession();
  } catch {
    return;
  }

  const session = parseSession(loaded);
  if (!session || session.workspaceRoot === null) return;

  let opened: boolean;
  try {
    opened = await runCommand(COMMAND_IDS.openPath, { path: session.workspaceRoot });
  } catch {
    opened = false;
  }
  if (!opened) return;

  for (const tab of session.tabs) {
    try {
      await openFile(tab.relPath, tab.cursor);
    } catch {
      // A file that disappeared since the last session is skipped silently.
    }
  }

  if (session.activeRelPath === null) return;
  const state = store.getState();
  const active = state.tabs.tabs.find((tab) => tab.relPath === session.activeRelPath);
  if (!active) return;

  if (state.tabs.activeId !== active.id) {
    store.dispatch({ type: 'tabs/focus', id: active.id });
  }
  const entry = getDocumentEntry(active.id);
  if (entry) {
    getEditorApi()?.setPosition(entry.cursor);
  }
}

export function initSessionSync(store: SessionSyncStore): () => void {
  let disposed = false;
  let unsubscribe: (() => void) | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let saving = false;
  let pendingSave = false;
  let lastActiveId: string | null = null;
  let lastSignature = '';

  const flush = (): void => {
    timer = null;
    if (disposed) return;

    if (saving) {
      pendingSave = true;
      return;
    }

    saving = true;
    void (async () => {
      try {
        await platform.persist.saveSession(buildSession(store));
      } catch {
        // An unwritable session file must never interrupt editing.
      } finally {
        saving = false;
        if (pendingSave) {
          pendingSave = false;
          schedule();
        }
      }
    })();
  };

  const schedule = (): void => {
    if (disposed) return;
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(flush, SAVE_DELAY_MS);
  };

  const captureActiveCursor = (activeId: string | null): void => {
    if (activeId === null) return;
    const editor = getEditorApi();
    if (!editor) return;
    setTabCursor(activeId, editor.getPosition());
  };

  const handleChange = (): void => {
    const state = store.getState();

    if (lastActiveId !== state.tabs.activeId) {
      captureActiveCursor(lastActiveId);
    } else {
      captureActiveCursor(state.tabs.activeId);
    }
    lastActiveId = state.tabs.activeId;

    const signature = signatureFor(state);
    if (signature === lastSignature) return;
    lastSignature = signature;
    schedule();
  };

  void (async () => {
    await restoreSession(store);
    if (disposed) return;

    lastActiveId = store.getState().tabs.activeId;
    lastSignature = signatureFor(store.getState());
    unsubscribe = store.subscribe(handleChange);
  })();

  return () => {
    disposed = true;
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  };
}
