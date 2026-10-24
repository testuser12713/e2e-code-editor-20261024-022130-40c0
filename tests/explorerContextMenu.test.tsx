// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { Notifications } from '../src/ui/Notify';
import type { OpResult, PlatformApi, ReadFileResult, TreeNode } from '../src/state/types';

type ExplorerViewModule = typeof import('../src/views/ExplorerView');
type StoreModule = typeof import('../src/state/store');

let ExplorerView: ExplorerViewModule['ExplorerView'];
let appStore: StoreModule['appStore'];

const created: { relPath: string; kind: string }[] = [];
const renamed: { fromRel: string; toRel: string }[] = [];
const removed: string[] = [];

let createResult: OpResult;
let renameResult: OpResult;
let removeResult: OpResult;
let listing: TreeNode[];
let fileContent: ReadFileResult;

const api = {
  workspace: {
    openDialog: vi.fn(async () => null),
    openFolder: vi.fn(async () => ({ ok: true })),
    getRoot: vi.fn(async () => '/mock'),
    listDir: vi.fn(async () => listing),
  },
  files: {
    read: vi.fn(async () => fileContent),
    write: vi.fn(async () => ({ ok: true })),
  },
  manage: {
    create: vi.fn(async (relPath: string, kind: string) => {
      created.push({ relPath, kind });
      return createResult;
    }),
    rename: vi.fn(async (fromRel: string, toRel: string) => {
      renamed.push({ fromRel, toRel });
      return renameResult;
    }),
    remove: vi.fn(async (relPath: string) => {
      removed.push(relPath);
      return removeResult;
    }),
  },
  quickOpen: { listFiles: vi.fn(async () => []) },
  search: {
    run: vi.fn(async () => []),
    cancel: vi.fn(async () => undefined),
  },
  persist: {
    loadSettings: vi.fn(async () => null),
    saveSettings: vi.fn(async () => ({ ok: true })),
    loadSession: vi.fn(async () => null),
    saveSession: vi.fn(async () => ({ ok: true })),
    loadRecentFolders: vi.fn(async () => []),
    addRecentFolder: vi.fn(async () => undefined),
    clearLocalData: vi.fn(async () => ({ ok: true })),
    userDataPath: vi.fn(async () => '/mock/userData'),
  },
  app: {
    openExternal: vi.fn(async () => undefined),
    onBeforeClose: vi.fn(() => () => undefined),
    confirmClose: vi.fn(),
  },
  menu: {
    setMenuState: vi.fn(),
    onCommand: vi.fn(() => () => undefined),
  },
};

function resetWorkspace(nodes: TreeNode[]): void {
  listing = nodes;
  appStore.dispatch({ type: 'workspace/open', root: '/mock' });
  appStore.dispatch({ type: 'workspace/list', relPath: '', nodes: [{ name: 'src', relPath: 'src', kind: 'dir' }] });
  appStore.dispatch({ type: 'workspace/toggle', relPath: 'src' });
  appStore.dispatch({ type: 'workspace/list', relPath: 'src', nodes });
  appStore.dispatch({ type: 'tabs/restore', tabs: [] });
  appStore.dispatch({ type: 'view/showExplorer' });
}

function renderExplorer(): void {
  render(
    <>
      <ExplorerView />
      <Notifications />
    </>,
  );
}

function openContextMenuFor(relPath: string): void {
  fireEvent.contextMenu(screen.getByTestId(`tree-row-${relPath}`));
}

beforeAll(async () => {
  (window as unknown as { api: PlatformApi }).api = api as unknown as PlatformApi;
  const store = await import('../src/state/store');
  const view = await import('../src/views/ExplorerView');
  appStore = store.appStore;
  ExplorerView = view.ExplorerView;
});

beforeEach(() => {
  created.length = 0;
  renamed.length = 0;
  removed.length = 0;
  createResult = { ok: true };
  renameResult = { ok: true };
  removeResult = { ok: true };
  fileContent = {
    ok: true,
    content: '',
    eol: 'lf',
    encoding: 'utf-8',
    language: 'TypeScript',
  };
  api.manage.create.mockClear();
  api.manage.rename.mockClear();
  api.manage.remove.mockClear();
  api.workspace.listDir.mockClear();
  resetWorkspace([]);
});

afterEach(() => {
  cleanup();
});

describe('explorer file management', () => {
  it('offers all four actions on a folder in the tree', () => {
    renderExplorer();
    openContextMenuFor('src');

    const menu = screen.getByTestId('explorer-context-menu');
    const labels = within(menu)
      .getAllByRole('menuitem')
      .map((item) => item.textContent);

    expect(labels).toEqual(['New File…', 'New Folder…', 'Rename', 'Delete']);
    expect(within(menu).getByTestId('tree-action-delete').className).toContain('is-danger');
  });

  it('creates a file through the bridge and shows it in the tree', async () => {
    renderExplorer();
    openContextMenuFor('src');

    fireEvent.click(screen.getByTestId('tree-action-new-file'));

    const dialog = await screen.findByTestId('tree-name-dialog');
    expect(within(dialog).getByText('New File')).toBeTruthy();
    expect(within(dialog).getByText('Inside src')).toBeTruthy();

    fireEvent.change(screen.getByTestId('tree-name-input'), { target: { value: 'hello.ts' } });

    listing = [{ name: 'hello.ts', relPath: 'src/hello.ts', kind: 'file' }];
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(created).toEqual([{ relPath: 'src/hello.ts', kind: 'file' }]);
    });
    await waitFor(() => {
      expect(screen.getByTestId('tree-row-src/hello.ts')).toBeTruthy();
    });
    expect(screen.queryByTestId('tree-name-dialog')).toBeNull();
  });

  it('reports an existing name without changing the tree', async () => {
    createResult = {
      ok: false,
      message: 'A file named hello.ts already exists in src. Nothing was written to disk.',
    };

    renderExplorer();
    openContextMenuFor('src');
    fireEvent.click(screen.getByTestId('tree-action-new-file'));

    const dialog = await screen.findByTestId('tree-name-dialog');
    fireEvent.change(screen.getByTestId('tree-name-input'), { target: { value: 'hello.ts' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(within(dialog).getByRole('alert').textContent).toContain('already exists');
    });
    expect(created).toEqual([{ relPath: 'src/hello.ts', kind: 'file' }]);
    expect(screen.queryByTestId('tree-row-src/hello.ts')).toBeNull();
    expect(screen.getByTestId('tree-name-dialog')).toBeTruthy();

    const notices = screen.getByTestId('notifications');
    expect(notices.textContent).toContain('already exists in src');
    expect(notices.textContent).toContain('Nothing was written to disk');
  });

  it('asks before deleting and removes the entry afterwards', async () => {
    listing = [{ name: 'hello.ts', relPath: 'src/hello.ts', kind: 'file' }];
    resetWorkspace(listing);

    renderExplorer();
    openContextMenuFor('src/hello.ts');
    fireEvent.click(screen.getByTestId('tree-action-delete'));

    const dialog = await screen.findByTestId('delete-dialog');
    expect(within(dialog).getByText('Delete hello.ts?')).toBeTruthy();
    expect(removed).toEqual([]);

    listing = [];
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(removed).toEqual(['src/hello.ts']);
    });
    await waitFor(() => {
      expect(screen.queryByTestId('tree-row-src/hello.ts')).toBeNull();
    });
  });

  it('renames an entry in place and refreshes the tree', async () => {
    listing = [{ name: 'hello.ts', relPath: 'src/hello.ts', kind: 'file' }];
    resetWorkspace(listing);

    renderExplorer();
    openContextMenuFor('src/hello.ts');
    fireEvent.click(screen.getByTestId('tree-action-rename'));

    const dialog = await screen.findByTestId('tree-name-dialog');
    const input = screen.getByTestId('tree-name-input') as HTMLInputElement;
    expect(input.value).toBe('hello.ts');

    fireEvent.change(input, { target: { value: 'greeting.ts' } });
    listing = [{ name: 'greeting.ts', relPath: 'src/greeting.ts', kind: 'file' }];
    fireEvent.click(within(dialog).getByRole('button', { name: 'Rename' }));

    await waitFor(() => {
      expect(renamed).toEqual([{ fromRel: 'src/hello.ts', toRel: 'src/greeting.ts' }]);
    });
    await waitFor(() => {
      expect(screen.getByTestId('tree-row-src/greeting.ts')).toBeTruthy();
    });
  });
});
