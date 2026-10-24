import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { OpResult } from '../src/state/types';

const require = createRequire(import.meta.url);

type FileOps = {
  createFile: (rootAbs: string, relPath: string) => OpResult;
  createDir: (rootAbs: string, relPath: string) => OpResult;
  renameEntry: (rootAbs: string, fromRel: string, toRel: string) => OpResult;
  removeEntry: (rootAbs: string, relPath: string) => OpResult;
};

const fileOps = require('../electron/lib/fileOps.cjs') as FileOps;

const manage = require('../electron/handlers/manage.cjs') as {
  create: (relPath: unknown, kind: unknown) => Promise<OpResult>;
  rename: (fromRel: unknown, toRel: unknown) => Promise<OpResult>;
  remove: (relPath: unknown) => Promise<OpResult>;
};

const workspaceHandlers = require('../electron/handlers/workspace.cjs') as {
  openFolder: (absPath: unknown) => Promise<OpResult>;
};

const { grantRoot } = require('../electron/lib/pathGuard.cjs') as {
  grantRoot: (absPath: string) => string | null;
};

let root = '';

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), 'forge-fileops-'));
  mkdirSync(path.join(root, 'src'));
  writeFileSync(path.join(root, 'README.md'), '# Forge\n');
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('fileOps.createFile', () => {
  it('creates an empty file inside the workspace', () => {
    const result = fileOps.createFile(root, 'src/notes.ts');

    expect(result).toEqual({ ok: true });
    expect(existsSync(path.join(root, 'src', 'notes.ts'))).toBe(true);
    expect(readFileSync(path.join(root, 'src', 'notes.ts'), 'utf8')).toBe('');
  });

  it('refuses an existing name with a readable message and keeps the file intact', () => {
    writeFileSync(path.join(root, 'README.md'), 'keep me\n');

    const result = fileOps.createFile(root, 'README.md');

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.message).toContain('README.md');
    expect(result.message).toContain('already exists');
    expect(result.message).toContain('Nothing was written to disk');
    expect(readFileSync(path.join(root, 'README.md'), 'utf8')).toBe('keep me\n');
  });

  it('refuses a missing parent folder with a readable message', () => {
    const result = fileOps.createFile(root, 'missing/notes.ts');

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.message).toContain('missing');
    expect(existsSync(path.join(root, 'missing'))).toBe(false);
  });
});

describe('fileOps.createDir', () => {
  it('creates a folder inside the workspace', () => {
    expect(fileOps.createDir(root, 'src/components')).toEqual({ ok: true });
    expect(existsSync(path.join(root, 'src', 'components'))).toBe(true);
  });

  it('refuses a folder whose name is already taken', () => {
    const result = fileOps.createDir(root, 'src');

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.message).toContain('A folder named src already exists');
  });
});

describe('fileOps.renameEntry', () => {
  it('renames a file and keeps its content', () => {
    writeFileSync(path.join(root, 'src', 'old.ts'), 'export const value = 1;\n');

    const result = fileOps.renameEntry(root, 'src/old.ts', 'src/new.ts');

    expect(result).toEqual({ ok: true });
    expect(existsSync(path.join(root, 'src', 'old.ts'))).toBe(false);
    expect(readFileSync(path.join(root, 'src', 'new.ts'), 'utf8')).toBe('export const value = 1;\n');
  });

  it('refuses to rename onto an existing entry and changes nothing', () => {
    writeFileSync(path.join(root, 'src', 'one.ts'), 'one\n');
    writeFileSync(path.join(root, 'src', 'two.ts'), 'two\n');

    const result = fileOps.renameEntry(root, 'src/one.ts', 'src/two.ts');

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.message).toContain('two.ts');
    expect(result.message).toContain('already exists');
    expect(readFileSync(path.join(root, 'src', 'one.ts'), 'utf8')).toBe('one\n');
    expect(readFileSync(path.join(root, 'src', 'two.ts'), 'utf8')).toBe('two\n');
  });

  it('refuses to move a folder into itself', () => {
    const result = fileOps.renameEntry(root, 'src', 'src/nested');

    expect(result.ok).toBe(false);
    expect(existsSync(path.join(root, 'src', 'nested'))).toBe(false);
  });

  it('refuses to rename a missing entry', () => {
    const result = fileOps.renameEntry(root, 'src/ghost.ts', 'src/other.ts');

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.message).toContain('no longer exists');
  });
});

describe('fileOps.removeEntry', () => {
  it('deletes a file', () => {
    writeFileSync(path.join(root, 'src', 'gone.ts'), 'tmp\n');

    expect(fileOps.removeEntry(root, 'src/gone.ts')).toEqual({ ok: true });
    expect(existsSync(path.join(root, 'src', 'gone.ts'))).toBe(false);
  });

  it('deletes a folder together with its contents', () => {
    mkdirSync(path.join(root, 'src', 'nested', 'deeper'), { recursive: true });
    writeFileSync(path.join(root, 'src', 'nested', 'deeper', 'file.ts'), 'tmp\n');

    expect(fileOps.removeEntry(root, 'src/nested')).toEqual({ ok: true });
    expect(existsSync(path.join(root, 'src', 'nested'))).toBe(false);
  });

  it('refuses a missing entry', () => {
    const result = fileOps.removeEntry(root, 'src/ghost.ts');

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.message).toContain('no longer exists');
  });

  it('refuses to delete the workspace root itself', () => {
    const result = fileOps.removeEntry(root, '');

    expect(result.ok).toBe(false);
    expect(existsSync(root)).toBe(true);
  });
});

describe('fileOps path guard', () => {
  it('rejects traversal above the workspace for every operation', () => {
    const outside = path.join(path.dirname(root), 'forge-outside.txt');
    const outsideDir = path.join(path.dirname(root), 'forge-outside-dir');
    rmSync(outside, { force: true });
    rmSync(outsideDir, { recursive: true, force: true });

    expect(fileOps.createFile(root, '../forge-outside.txt').ok).toBe(false);
    expect(fileOps.createDir(root, '../forge-outside-dir').ok).toBe(false);
    expect(fileOps.renameEntry(root, 'README.md', '../forge-outside.txt').ok).toBe(false);
    expect(fileOps.removeEntry(root, '../forge-outside.txt').ok).toBe(false);

    expect(existsSync(outside)).toBe(false);
    expect(existsSync(outsideDir)).toBe(false);
    expect(existsSync(path.join(root, 'README.md'))).toBe(true);
  });

  it('rejects absolute paths', () => {
    const absolute = path.join(path.dirname(root), 'forge-absolute.ts');
    rmSync(absolute, { force: true });

    const result = fileOps.createFile(root, absolute);

    expect(result.ok).toBe(false);
    expect(existsSync(absolute)).toBe(false);
  });

  it('rejects a symlink that points outside the workspace', () => {
    const outside = path.join(path.dirname(root), `forge-outside-${Date.now()}`);
    mkdirSync(outside, { recursive: true });

    try {
      symlinkSync(outside, path.join(root, 'escape-link'), 'dir');
    } catch {
      rmSync(outside, { recursive: true, force: true });
      return;
    }

    try {
      const result = fileOps.createFile(root, 'escape-link/evil.ts');
      expect(result.ok).toBe(false);
      expect(existsSync(path.join(outside, 'evil.ts'))).toBe(false);
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });
});

describe('manage handler argument validation', () => {
  it('rejects invalid arguments without touching the file system', async () => {
    await expect(manage.create(42, 'file')).resolves.toMatchObject({ ok: false });
    await expect(manage.create('', 'file')).resolves.toMatchObject({ ok: false });
    await expect(manage.create('notes.ts', 'symlink')).resolves.toMatchObject({ ok: false });
    await expect(manage.rename('README.md', 7)).resolves.toMatchObject({ ok: false });
    await expect(manage.remove(null)).resolves.toMatchObject({ ok: false });
    expect(existsSync(path.join(root, 'notes.ts'))).toBe(false);
  });

  it('runs create, rename and remove through the handlers', async () => {
    grantRoot(root);
    await expect(workspaceHandlers.openFolder(root)).resolves.toEqual({ ok: true });

    await expect(manage.create('src/created.ts', 'file')).resolves.toEqual({ ok: true });
    expect(existsSync(path.join(root, 'src', 'created.ts'))).toBe(true);

    await expect(manage.rename('src/created.ts', 'src/renamed.ts')).resolves.toEqual({ ok: true });
    expect(existsSync(path.join(root, 'src', 'created.ts'))).toBe(false);
    expect(existsSync(path.join(root, 'src', 'renamed.ts'))).toBe(true);

    await expect(manage.remove('src/renamed.ts')).resolves.toEqual({ ok: true });
    expect(existsSync(path.join(root, 'src', 'renamed.ts'))).toBe(false);
  });
});
