import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { OpResult, ReadFileResult } from '../src/state/types';

const require = createRequire(import.meta.url);
const fs = require('node:fs') as typeof import('node:fs');

type FilesHandlers = {
  read: (relPath: unknown) => Promise<ReadFileResult>;
  write: (relPath: unknown, content: unknown, eol: unknown) => Promise<OpResult>;
};

type WorkspaceHandlers = {
  openFolder: (absPath: string) => Promise<OpResult>;
  getRoot: () => Promise<string | null>;
};

const files = require('../electron/handlers/files.cjs') as FilesHandlers;
const workspace = require('../electron/handlers/workspace.cjs') as WorkspaceHandlers;

let root: string;

beforeEach(async () => {
  root = mkdtempSync(path.join(tmpdir(), 'forge-atomic-'));
  const opened = await workspace.openFolder(root);
  expect(opened.ok).toBe(true);
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('atomic file writes', () => {
  it('replaces the target with the complete new content', async () => {
    writeFileSync(path.join(root, 'notes.txt'), 'old content\n', 'utf8');

    const result = await files.write('notes.txt', 'new content\nsecond line\n', 'lf');

    expect(result).toEqual({ ok: true });
    expect(readFileSync(path.join(root, 'notes.txt'), 'utf8')).toBe('new content\nsecond line\n');
    expect(readdirSync(root).filter((name) => name !== 'notes.txt')).toEqual([]);
  });

  it('keeps the previous file intact when the rename is interrupted', async () => {
    const original = 'old content that must survive\n';
    writeFileSync(path.join(root, 'notes.txt'), original, 'utf8');

    const renameSpy = vi.spyOn(fs, 'renameSync').mockImplementation(() => {
      throw new Error('simulated abort');
    });

    try {
      const result = await files.write('notes.txt', 'partial replacement\n', 'lf');
      expect(result.ok).toBe(false);
    } finally {
      renameSpy.mockRestore();
    }

    expect(readFileSync(path.join(root, 'notes.txt'), 'utf8')).toBe(original);
    expect(readdirSync(root).filter((name) => name !== 'notes.txt')).toEqual([]);
  });

  it('writes CRLF line endings on request and reports them when read back', async () => {
    mkdirSync(path.join(root, 'src'));
    const written = await files.write('src/line-endings.txt', 'one\ntwo\n', 'crlf');
    expect(written.ok).toBe(true);

    expect(readFileSync(path.join(root, 'src', 'line-endings.txt'), 'utf8')).toBe(
      'one\r\ntwo\r\n',
    );

    const readBack = await files.read('src/line-endings.txt');
    expect(readBack.ok).toBe(true);
    if (readBack.ok) {
      expect(readBack.eol).toBe('crlf');
      expect(readBack.content).toBe('one\ntwo\n');
    }
  });

  it('rejects invalid arguments without touching the disk', async () => {
    expect((await files.read(42)).ok).toBe(false);
    expect((await files.write('notes.txt', 42, 'lf')).ok).toBe(false);
    expect((await files.write('notes.txt', 'content', 'cr')).ok).toBe(false);
    expect((await files.write('../escape.txt', 'content', 'lf')).ok).toBe(false);
    expect(readdirSync(root)).toEqual([]);
  });
});

describe('file reads', () => {
  it('reports the language, line ending and encoding for supported extensions', async () => {
    writeFileSync(path.join(root, 'sample.ts'), 'export const answer = 42;\n', 'utf8');
    writeFileSync(path.join(root, 'config.yml'), 'name: forge\n', 'utf8');
    writeFileSync(path.join(root, 'readme.md'), '# Forge\n', 'utf8');

    const typescript = await files.read('sample.ts');
    const yaml = await files.read('config.yml');
    const markdown = await files.read('readme.md');

    expect(typescript.ok).toBe(true);
    expect(yaml.ok).toBe(true);
    expect(markdown.ok).toBe(true);
    if (typescript.ok) {
      expect(typescript.language).toBe('TypeScript');
      expect(typescript.encoding).toBe('utf-8');
      expect(typescript.eol).toBe('lf');
    }
    if (yaml.ok) expect(yaml.language).toBe('YAML');
    if (markdown.ok) expect(markdown.language).toBe('Markdown');
  });

  it('refuses files above two megabytes with the too-large reason', async () => {
    writeFileSync(path.join(root, 'electron.log'), Buffer.alloc(2 * 1024 * 1024 + 1, 0x61));

    const result = await files.read('electron.log');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('too-large');
      expect(result.message).toContain('2 MB');
    }
  });

  it('refuses binary content with the binary reason', async () => {
    writeFileSync(path.join(root, 'hero.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x01]));

    const result = await files.read('hero.png');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('binary');
  });

  it('reports a missing file instead of creating it', async () => {
    const result = await files.read('missing.ts');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('not-found');
    expect(readdirSync(root)).toEqual([]);
  });

  it('rejects paths that leave the workspace', async () => {
    const result = await files.read('../outside.txt');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('outside-workspace');
  });
});
