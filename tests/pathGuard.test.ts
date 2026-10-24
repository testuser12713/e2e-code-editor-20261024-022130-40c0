import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { PathError, assertRoot, resolveInWorkspace } = require('../electron/lib/pathGuard.cjs') as {
  PathError: new (message?: string, code?: string) => Error & { code?: string };
  assertRoot: (absPath: string) => string;
  resolveInWorkspace: (root: string, relPath: string) => string;
};

let root = '';
let outside = '';

beforeAll(() => {
  root = mkdtempSync(path.join(tmpdir(), 'forge-pathguard-'));
  outside = mkdtempSync(path.join(tmpdir(), 'forge-outside-'));

  mkdirSync(path.join(root, 'src'));
  writeFileSync(path.join(root, 'README.md'), '# Forge\n');
  writeFileSync(path.join(root, 'src', 'app.ts'), 'export const app = true;\n');
  writeFileSync(path.join(outside, 'secret.txt'), 'not yours\n');

  try {
    symlinkSync(outside, path.join(root, 'escape'), 'dir');
  } catch {
    // Symbolic links are not available on every platform.
  }
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
  rmSync(outside, { recursive: true, force: true });
});

describe('pathGuard', () => {
  it('accepts paths inside the workspace root', () => {
    const resolved = resolveInWorkspace(root, 'src/app.ts');
    expect(resolved).toBe(realpathSync(path.join(root, 'src', 'app.ts')));
  });

  it('resolves the workspace root itself for an empty relative path', () => {
    expect(resolveInWorkspace(root, '')).toBe(realpathSync(root));
  });

  it('accepts a not-yet-existing path inside the workspace', () => {
    const resolved = resolveInWorkspace(root, 'src/new-file.ts');
    expect(resolved).toBe(path.join(realpathSync(root), 'src', 'new-file.ts'));
  });

  it('rejects parent-directory traversal', () => {
    expect(() => resolveInWorkspace(root, '../secret.txt')).toThrow(PathError);
    expect(() => resolveInWorkspace(root, 'src/../../secret.txt')).toThrow(PathError);
  });

  it('rejects absolute paths', () => {
    expect(() => resolveInWorkspace(root, path.join(outside, 'secret.txt'))).toThrow(PathError);
    expect(() => resolveInWorkspace(root, '/etc/passwd')).toThrow(PathError);
  });

  it('rejects a symbolic link that points outside the workspace', () => {
    let linked = true;
    try {
      symlinkSync(outside, path.join(root, 'escape-check'), 'dir');
    } catch {
      linked = false;
    }
    if (!linked) return;

    expect(() => resolveInWorkspace(root, 'escape-check/secret.txt')).toThrow(PathError);
  });

  it('rejects a dangling symbolic link that points outside the workspace', () => {
    let linked = true;
    try {
      symlinkSync(path.join(outside, 'ghost.txt'), path.join(root, 'ghost-link'));
    } catch {
      linked = false;
    }
    if (!linked) return;

    expect(() => resolveInWorkspace(root, 'ghost-link')).toThrow(PathError);
  });

  it('rejects a workspace root that is relative or missing', () => {
    expect(() => assertRoot('relative/folder')).toThrow(PathError);
    expect(() => assertRoot(path.join(root, 'missing-folder'))).toThrow(PathError);
  });
});
