import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { OpResult, ReadFileResult, TreeNode } from '../src/state/types';

const require = createRequire(import.meta.url);

type WorkspaceHandlers = {
  openDialog: () => Promise<string | null>;
  openFolder: (absPath: unknown) => Promise<OpResult>;
  getRoot: () => Promise<string | null>;
  listDir: (relPath: string) => Promise<TreeNode[]>;
};

type FilesHandlers = {
  read: (relPath: string) => Promise<ReadFileResult>;
};

type PersistLib = {
  addRecentFolder: (userDataDir: string, absPath: string) => OpResult;
  writeSession: (userDataDir: string, session: unknown) => OpResult;
};

const workspace = require('../electron/handlers/workspace.cjs') as WorkspaceHandlers;
const files = require('../electron/handlers/files.cjs') as FilesHandlers;
const persist = require('../electron/lib/persist.cjs') as PersistLib;
const { grantRoot } = require('../electron/lib/pathGuard.cjs') as {
  grantRoot: (absPath: string) => string | null;
};

const electronPath = require.resolve('electron');
const requireCache = require.cache as Record<string, { exports: unknown } | undefined>;
const originalElectron = requireCache[electronPath];

function installElectron(fake: Record<string, unknown>): void {
  requireCache[electronPath] = { exports: fake };
}

function makeDir(name: string): string {
  return mkdtempSync(path.join(tmpdir(), `forge-grant-${name}-`));
}

let base = '';

beforeEach(() => {
  base = makeDir('base');
});

afterEach(() => {
  if (originalElectron === undefined) {
    delete requireCache[electronPath];
  } else {
    requireCache[electronPath] = originalElectron;
  }
  rmSync(base, { recursive: true, force: true });
});

describe('workspace root grants', () => {
  it('refuses an ungranted absolute path while the previous root keeps answering', async () => {
    const granted = path.join(base, 'granted');
    const outside = path.join(base, 'outside');
    mkdirSync(granted);
    mkdirSync(outside);
    writeFileSync(path.join(granted, 'README.md'), '# Granted\n');
    writeFileSync(path.join(outside, 'secret.txt'), 'outside the granted folder\n');

    grantRoot(granted);
    await expect(workspace.openFolder(granted)).resolves.toEqual({ ok: true });

    const refused = await workspace.openFolder(outside);
    expect(refused.ok).toBe(false);
    if (refused.ok) throw new Error('expected the ungranted folder to be refused');
    expect(refused.message.length).toBeGreaterThan(0);

    await expect(workspace.getRoot()).resolves.toBe(realpathSync(granted));

    const nodes = await workspace.listDir('');
    const names = nodes.map((node) => node.name);
    expect(names).toContain('README.md');
    expect(names).not.toContain('secret.txt');

    const read = await files.read('secret.txt');
    expect(read.ok).toBe(false);
  });

  it('accepts a folder granted through the native dialog', async () => {
    const granted = path.join(base, 'dialog-granted');
    mkdirSync(granted);

    installElectron({
      app: {
        getPath: () => '',
      },
      dialog: {
        showOpenDialog: async () => ({ canceled: false, filePaths: [granted] }),
      },
    });

    const selected = await workspace.openDialog();
    expect(selected).toBe(granted);

    await expect(workspace.openFolder(selected)).resolves.toEqual({ ok: true });
    await expect(workspace.getRoot()).resolves.toBe(realpathSync(granted));
  });

  it('accepts a folder named by the persisted recent-folders list', async () => {
    const userData = path.join(base, 'user-data');
    const recent = path.join(base, 'recent');
    mkdirSync(userData);
    mkdirSync(recent);

    expect(persist.addRecentFolder(userData, recent)).toEqual({ ok: true });

    installElectron({
      app: {
        getPath: (name: string) => (name === 'userData' ? userData : ''),
      },
    });

    await expect(workspace.openFolder(recent)).resolves.toEqual({ ok: true });
    await expect(workspace.getRoot()).resolves.toBe(realpathSync(recent));
  });

  it('accepts the workspace root named by the restored session', async () => {
    const userData = path.join(base, 'user-data');
    const saved = path.join(base, 'saved-workspace');
    mkdirSync(userData);
    mkdirSync(saved);

    expect(
      persist.writeSession(userData, { workspaceRoot: saved, tabs: [], activeRelPath: null }),
    ).toEqual({ ok: true });

    installElectron({
      app: {
        getPath: (name: string) => (name === 'userData' ? userData : ''),
      },
    });

    await expect(workspace.openFolder(saved)).resolves.toEqual({ ok: true });
    await expect(workspace.getRoot()).resolves.toBe(realpathSync(saved));
  });

  it('changes nothing on disk when an ungranted folder is refused', async () => {
    const granted = path.join(base, 'granted');
    const outside = path.join(base, 'outside');
    const nested = path.join(outside, 'nested');
    const secret = path.join(outside, 'keep.txt');
    mkdirSync(granted);
    mkdirSync(nested, { recursive: true });
    writeFileSync(secret, 'keep me\n');

    grantRoot(granted);
    await expect(workspace.openFolder(granted)).resolves.toEqual({ ok: true });

    const before = readdirSync(outside).sort();
    const refused = await workspace.openFolder(outside);
    expect(refused.ok).toBe(false);

    expect(readdirSync(outside).sort()).toEqual(before);
    expect(readFileSync(secret, 'utf8')).toBe('keep me\n');
    await expect(workspace.getRoot()).resolves.toBe(realpathSync(granted));
  });
});
