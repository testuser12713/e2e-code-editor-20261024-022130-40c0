import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { walkFiles } = require('../electron/lib/walkWorkspace.cjs') as {
  walkFiles: (rootAbs: string, options?: { maxFiles?: number; ignore?: string[] }) => string[];
};

let root = '';

beforeAll(() => {
  root = mkdtempSync(path.join(tmpdir(), 'forge-walk-'));

  mkdirSync(path.join(root, 'src'));
  mkdirSync(path.join(root, 'docs'));
  mkdirSync(path.join(root, 'dist'));
  mkdirSync(path.join(root, 'node_modules', 'left-pad'), { recursive: true });
  mkdirSync(path.join(root, '.git'));

  writeFileSync(path.join(root, 'README.md'), '# Forge\n');
  writeFileSync(path.join(root, 'src', 'app.ts'), 'export {};\n');
  writeFileSync(path.join(root, 'docs', 'guide.md'), '# Guide\n');
  writeFileSync(path.join(root, 'dist', 'bundle.js'), 'console.log(1);\n');
  writeFileSync(path.join(root, 'node_modules', 'left-pad', 'index.js'), 'module.exports = 1;\n');
  writeFileSync(path.join(root, '.git', 'config'), '[core]\n');
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('walkWorkspace', () => {
  it('returns POSIX relative file paths', () => {
    const files = walkFiles(root, { maxFiles: 100 });

    expect(files).toContain('README.md');
    expect(files).toContain('src/app.ts');
    expect(files).toContain('docs/guide.md');
    expect(files.every((file) => !file.includes('\\'))).toBe(true);
  });

  it('skips node_modules and .git', () => {
    const files = walkFiles(root, { maxFiles: 100 });

    expect(files.some((file) => file.startsWith('node_modules/'))).toBe(false);
    expect(files.some((file) => file.startsWith('.git/'))).toBe(false);
  });

  it('applies additional ignore entries', () => {
    const files = walkFiles(root, { maxFiles: 100, ignore: ['dist'] });

    expect(files.some((file) => file.startsWith('dist/'))).toBe(false);
    expect(files).toContain('src/app.ts');
  });

  it('stops at maxFiles', () => {
    const files = walkFiles(root, { maxFiles: 2 });

    expect(files).toHaveLength(2);
  });
});
