import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { OpResult, TreeNode } from '../src/state/types';

const require = createRequire(import.meta.url);

const fileTree = require('../electron/lib/fileTree.cjs') as {
  IGNORED_DIRECTORIES: Set<string>;
  listDir: (rootAbs: string, relPath?: string) => TreeNode[];
};

const handlers = require('../electron/handlers/workspace.cjs') as {
  openFolder: (absPath: unknown) => Promise<OpResult>;
  getRoot: () => Promise<string | null>;
  listDir: (relPath: unknown) => Promise<TreeNode[]>;
};

const { grantRoot } = require('../electron/lib/pathGuard.cjs') as {
  grantRoot: (absPath: string) => string | null;
};

let root = '';

beforeAll(() => {
  root = mkdtempSync(path.join(tmpdir(), 'forge-filetree-'));

  mkdirSync(path.join(root, 'Assets'));
  mkdirSync(path.join(root, 'docs'));
  mkdirSync(path.join(root, 'src', 'components'), { recursive: true });
  mkdirSync(path.join(root, 'src', 'node_modules', 'pkg'), { recursive: true });
  mkdirSync(path.join(root, 'node_modules', 'pkg'), { recursive: true });
  mkdirSync(path.join(root, '.git'));

  writeFileSync(path.join(root, '.gitignore'), 'node_modules\n');
  writeFileSync(path.join(root, 'package.json'), '{}\n');
  writeFileSync(path.join(root, 'README.md'), '# Forge\n');
  writeFileSync(path.join(root, 'docs', 'guide.md'), '# Guide\n');
  writeFileSync(path.join(root, 'src', 'app.ts'), 'export {};\n');
  writeFileSync(path.join(root, 'src', 'Zeta.ts'), 'export {};\n');
  writeFileSync(path.join(root, 'src', 'Alpha.ts'), 'export {};\n');
  writeFileSync(path.join(root, 'src', 'components', 'widget.ts'), 'export {};\n');
  writeFileSync(path.join(root, 'src', 'node_modules', 'pkg', 'index.js'), 'module.exports = 1;\n');
  writeFileSync(path.join(root, 'node_modules', 'pkg', 'index.js'), 'module.exports = 1;\n');
  writeFileSync(path.join(root, '.git', 'config'), '[core]\n');
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('fileTree.listDir', () => {
  it('returns folders before files', () => {
    const nodes = fileTree.listDir(root, '');
    const kinds = nodes.map((node) => node.kind);
    const firstFile = kinds.indexOf('file');

    expect(firstFile).toBeGreaterThan(0);
    expect(kinds.slice(0, firstFile).every((kind) => kind === 'dir')).toBe(true);
    expect(kinds.slice(firstFile).every((kind) => kind === 'file')).toBe(true);
  });

  it('sorts folders and files alphabetically regardless of case', () => {
    const nodes = fileTree.listDir(root, '');

    expect(nodes.map((node) => node.name)).toEqual([
      'Assets',
      'docs',
      'src',
      '.gitignore',
      'package.json',
      'README.md',
    ]);
  });

  it('uses POSIX relative paths without the workspace prefix', () => {
    const rootNodes = fileTree.listDir(root, '');
    const sourceNodes = fileTree.listDir(root, 'src');

    expect(rootNodes.every((node) => node.relPath === node.name)).toBe(true);
    expect(rootNodes.every((node) => !node.relPath.startsWith(root))).toBe(true);
    expect(rootNodes.every((node) => !node.relPath.includes('\\'))).toBe(true);
    expect(sourceNodes.find((node) => node.name === 'app.ts')?.relPath).toBe('src/app.ts');
    expect(sourceNodes.find((node) => node.name === 'components')?.relPath).toBe('src/components');
  });

  it('lists only a single directory level', () => {
    const nodes = fileTree.listDir(root, 'src');

    expect(nodes.map((node) => node.name)).toEqual([
      'components',
      'Alpha.ts',
      'app.ts',
      'Zeta.ts',
    ]);
    expect(nodes.some((node) => node.relPath.includes('widget.ts'))).toBe(false);
  });

  it('tolerates leading, trailing and duplicated separators', () => {
    const nodes = fileTree.listDir(root, '/src/');

    expect(nodes.map((node) => node.relPath)).toContain('src/app.ts');
    expect(nodes.every((node) => !node.relPath.startsWith('/'))).toBe(true);
  });

  it('omits node_modules and .git at every level', () => {
    expect(fileTree.IGNORED_DIRECTORIES.has('node_modules')).toBe(true);
    expect(fileTree.IGNORED_DIRECTORIES.has('.git')).toBe(true);

    const rootNames = fileTree.listDir(root, '').map((node) => node.name);
    const sourceNames = fileTree.listDir(root, 'src').map((node) => node.name);

    expect(rootNames).not.toContain('node_modules');
    expect(rootNames).not.toContain('.git');
    expect(sourceNames).not.toContain('node_modules');
  });

  it('rejects paths that escape the workspace', () => {
    expect(() => fileTree.listDir(root, '..')).toThrow();
    expect(() => fileTree.listDir(root, path.join(root, 'src'))).toThrow();
  });
});

describe('workspace handlers', () => {
  it('rejects folder paths that are not absolute strings', async () => {
    await expect(handlers.openFolder('relative/folder')).resolves.toMatchObject({ ok: false });
    await expect(handlers.openFolder('')).resolves.toMatchObject({ ok: false });
    await expect(handlers.openFolder(42)).resolves.toMatchObject({ ok: false });
  });

  it('opens a folder and lists its top level through the handler', async () => {
    grantRoot(root);
    await expect(handlers.openFolder(root)).resolves.toEqual({ ok: true });
    await expect(handlers.getRoot()).resolves.toBe(realpathSync(root));

    const nodes = await handlers.listDir('');
    expect(nodes.map((node) => node.name)).toEqual([
      'Assets',
      'docs',
      'src',
      '.gitignore',
      'package.json',
      'README.md',
    ]);
  });

  it('rejects invalid and escaping directory arguments', async () => {
    await expect(handlers.listDir(7)).rejects.toThrow();
    await expect(handlers.listDir('../outside')).rejects.toThrow();
  });
});
