import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TabsAction } from '../src/state/tabsReducer';
import type { AppState, Tab } from '../src/state/types';

const mocks = vi.hoisted(() => ({
  loadSession: vi.fn(),
  saveSession: vi.fn(),
  runCommand: vi.fn(),
  openFile: vi.fn(),
  getEditorApi: vi.fn(),
  getDocumentEntry: vi.fn(),
  setTabCursor: vi.fn(),
}));

vi.mock('../src/platform', () => ({
  platform: {
    persist: {
      loadSession: mocks.loadSession,
      saveSession: mocks.saveSession,
    },
  },
}));

vi.mock('../src/commands/registry', () => ({
  runCommand: mocks.runCommand,
}));

vi.mock('../src/state/documents', () => ({
  openFile: mocks.openFile,
  getEditorApi: mocks.getEditorApi,
  getDocumentEntry: mocks.getDocumentEntry,
  setTabCursor: mocks.setTabCursor,
}));

import { initSessionSync } from '../src/state/sessionSync';
import { INITIAL_STATE } from '../src/state/store';

type Cursor = { line: number; column: number };

let cursors: Record<string, Cursor> = {};

function createStore(initial: AppState) {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    getState: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    update: (updater: (current: AppState) => AppState) => {
      state = updater(state);
      for (const listener of listeners) listener();
    },
    dispatch: (action: TabsAction) => {
      if (action.type === 'tabs/focus' && state.tabs.tabs.some((entry) => entry.id === action.id)) {
        state = { ...state, tabs: { ...state.tabs, activeId: action.id } };
        for (const listener of listeners) listener();
      }
    },
  };
}

function tab(id: string, relPath: string): Tab {
  return { id, relPath, name: relPath.split('/').pop() ?? relPath };
}

function stateWithTabs(tabs: Tab[], activeId: string | null, root: string | null = '/workspace'): AppState {
  const active = tabs.find((entry) => entry.id === activeId) ?? null;
  return {
    ...INITIAL_STATE,
    workspace: { root, listings: {}, expanded: {} },
    tabs: { tabs, activeId, dirty: {} },
    status: {
      ...INITIAL_STATE.status,
      relPath: active ? active.relPath : null,
    },
  };
}

async function settle(): Promise<void> {
  for (let index = 0; index < 12; index += 1) {
    await Promise.resolve();
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  cursors = {};
  mocks.loadSession.mockResolvedValue(null);
  mocks.saveSession.mockResolvedValue({ ok: true });
  mocks.getEditorApi.mockReturnValue(null);
  mocks.getDocumentEntry.mockImplementation((id: string) => ({
    cursor: cursors[id] ?? { line: 1, column: 1 },
  }));
  mocks.setTabCursor.mockImplementation((id: string, cursor: Cursor) => {
    cursors[id] = cursor;
  });
  mocks.openFile.mockResolvedValue(true);
  mocks.runCommand.mockResolvedValue(true);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('sessionSync saving', () => {
  it('maps the open tabs and their cursors into SessionState', async () => {
    vi.useFakeTimers();
    const store = createStore(
      stateWithTabs([tab('a', 'src/a.ts'), tab('b', 'src/b.ts')], 'b'),
    );
    cursors = {
      a: { line: 2, column: 3 },
      b: { line: 1, column: 1 },
    };
    mocks.getEditorApi.mockReturnValue({
      getPosition: () => ({ line: 5, column: 2 }),
    });

    initSessionSync(store);
    await settle();

    store.update((current) => ({
      ...current,
      status: { ...current.status, line: 5, column: 2 },
    }));
    await vi.advanceTimersByTimeAsync(300);

    expect(mocks.saveSession).toHaveBeenCalledTimes(1);
    expect(mocks.saveSession).toHaveBeenCalledWith({
      workspaceRoot: '/workspace',
      tabs: [
        { relPath: 'src/a.ts', cursor: { line: 2, column: 3 } },
        { relPath: 'src/b.ts', cursor: { line: 5, column: 2 } },
      ],
      activeRelPath: 'src/b.ts',
    });
  });

  it('captures the previous cursor from the editor before a tab switch', async () => {
    vi.useFakeTimers();
    const store = createStore(
      stateWithTabs([tab('a', 'src/a.ts'), tab('b', 'src/b.ts')], 'b'),
    );
    mocks.getEditorApi.mockReturnValue({
      getPosition: () => ({ line: 9, column: 4 }),
    });

    initSessionSync(store);
    await settle();

    store.update((current) => ({
      ...current,
      tabs: { ...current.tabs, activeId: 'a' },
    }));
    await vi.advanceTimersByTimeAsync(300);

    expect(mocks.setTabCursor).toHaveBeenCalledWith('b', { line: 9, column: 4 });
    const saved = mocks.saveSession.mock.calls.at(-1)?.[0] as {
      activeRelPath: string | null;
      tabs: { relPath: string; cursor: Cursor }[];
    };
    expect(saved.activeRelPath).toBe('src/a.ts');
    expect(saved.tabs[1]).toEqual({ relPath: 'src/b.ts', cursor: { line: 9, column: 4 } });
  });
});

describe('sessionSync restoring', () => {
  it('reopens the workspace root and every stored tab in order, then activates the stored tab', async () => {
    mocks.loadSession.mockResolvedValue({
      workspaceRoot: '/stored/workspace',
      tabs: [
        { relPath: 'src/a.ts', cursor: { line: 4, column: 2 } },
        { relPath: 'src/b.ts', cursor: { line: 7, column: 1 } },
      ],
      activeRelPath: 'src/a.ts',
    });
    cursors = {
      'src/a.ts': { line: 4, column: 2 },
      'src/b.ts': { line: 7, column: 1 },
    };

    const store = createStore(stateWithTabs([], null, null));
    mocks.openFile.mockImplementation(async (relPath: string) => {
      store.update((current) => ({
        ...current,
        tabs: {
          tabs: [...current.tabs.tabs, tab(relPath, relPath)],
          activeId: relPath,
          dirty: { ...current.tabs.dirty },
        },
      }));
      return true;
    });

    initSessionSync(store);
    await settle();

    expect(mocks.runCommand).toHaveBeenCalledWith('workspace.openPath', {
      path: '/stored/workspace',
    });
    expect(mocks.openFile.mock.calls.map((call) => call[0])).toEqual([
      'src/a.ts',
      'src/b.ts',
    ]);
    expect(mocks.openFile.mock.calls.map((call) => call[1])).toEqual([
      { line: 4, column: 2 },
      { line: 7, column: 1 },
    ]);
    expect(store.getState().tabs.activeId).toBe('src/a.ts');
  });

  it('leaves the welcome state alone when the session cannot be read', async () => {
    mocks.loadSession.mockRejectedValue(new Error('session file is corrupt'));

    const store = createStore(stateWithTabs([], null, null));
    const before = store.getState();

    initSessionSync(store);
    await settle();

    expect(store.getState()).toEqual(before);
    expect(mocks.runCommand).not.toHaveBeenCalled();
    expect(mocks.openFile).not.toHaveBeenCalled();
    expect(mocks.saveSession).not.toHaveBeenCalled();
  });

  it('opens nothing when there is no stored session', async () => {
    mocks.loadSession.mockResolvedValue(null);

    const store = createStore(stateWithTabs([], null, null));
    const before = store.getState();

    initSessionSync(store);
    await settle();

    expect(store.getState()).toEqual(before);
    expect(mocks.runCommand).not.toHaveBeenCalled();
    expect(mocks.openFile).not.toHaveBeenCalled();
  });
});
