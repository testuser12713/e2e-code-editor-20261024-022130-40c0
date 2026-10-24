// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const { listFiles } = vi.hoisted(() => ({ listFiles: vi.fn() }));

vi.mock('../src/platform', () => ({
  platform: {
    quickOpen: {
      listFiles,
    },
  },
}));

import { QuickOpen } from '../src/components/QuickOpen';
import { getCommands, registerCommands } from '../src/commands/registry';

const WORKSPACE_FILES = [
  'README.md',
  'electron/handlers/files.cjs',
  'src/state/documents.ts',
  'src/state/types.ts',
];

const openedFiles: unknown[] = [];

beforeEach(() => {
  openedFiles.length = 0;
  listFiles.mockReset();
  listFiles.mockResolvedValue(WORKSPACE_FILES.slice());
  registerCommands([
    {
      id: 'file.open',
      title: 'File: Open File',
      run: (args) => {
        openedFiles.push(args);
        return true;
      },
    },
  ]);
});

afterEach(() => {
  cleanup();
});

async function openPalette(onClose = vi.fn()) {
  render(<QuickOpen open onClose={onClose} />);
  await waitFor(() => {
    expect(screen.getByTestId('quick-open')).toBeTruthy();
    expect(screen.getByTestId('quick-open-item-README.md')).toBeTruthy();
  });
  return {
    onClose,
    input: screen.getByLabelText('Search files by name') as HTMLInputElement,
  };
}

describe('quick open', () => {
  it('registers Ctrl+P and opens the palette through its command', async () => {
    const command = getCommands().find((entry) => entry.id === 'file.quickOpen');
    expect(command?.keybinding).toBe('Ctrl+P');

    const onClose = vi.fn();
    render(<QuickOpen open={false} onClose={onClose} />);
    expect(screen.queryByTestId('quick-open')).toBeNull();

    await getCommands().find((entry) => entry.id === 'file.quickOpen')?.run();
    await waitFor(() => {
      expect(screen.getByTestId('quick-open')).toBeTruthy();
    });
  });

  it('lists workspace files with the full path as detail', async () => {
    await openPalette();

    expect(screen.getByText('Workspace files')).toBeTruthy();
    expect(screen.getByText('src/state/documents.ts')).toBeTruthy();
    expect(listFiles).toHaveBeenCalledTimes(1);
  });

  it('filters the workspace files fuzzily as the query changes', async () => {
    const { input } = await openPalette();

    fireEvent.change(input, { target: { value: 'docu' } });

    expect(screen.getByText('documents.ts')).toBeTruthy();
    expect(screen.queryByText('types.ts')).toBeNull();
    expect(screen.queryByTestId('quick-open-item-README.md')).toBeNull();
    expect(listFiles).toHaveBeenCalledTimes(1);
  });

  it('shows the empty state when nothing matches the query', async () => {
    const { input } = await openPalette();

    fireEvent.change(input, { target: { value: 'zzzzzz' } });

    expect(screen.getByText('No workspace file matches that query.')).toBeTruthy();
  });

  it('opens the marked file on Enter and closes the palette', async () => {
    const { input, onClose } = await openPalette();

    fireEvent.change(input, { target: { value: 'docu' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(openedFiles).toEqual([{ relPath: 'src/state/documents.ts' }]);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape without opening a file', async () => {
    const { onClose } = await openPalette();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(openedFiles).toHaveLength(0);
  });
});

const require = createRequire(import.meta.url);

const quickOpenHandlers = require('../electron/handlers/quickopen.cjs') as {
  listFiles: (...args: unknown[]) => Promise<string[]>;
};
const workspaceHandlers = require('../electron/handlers/workspace.cjs') as {
  openFolder: (absPath: unknown) => Promise<{ ok: boolean }>;
};

let root = '';

beforeAll(() => {
  root = mkdtempSync(path.join(tmpdir(), 'forge-quickopen-'));
  mkdirSync(path.join(root, 'src'));
  mkdirSync(path.join(root, 'node_modules', 'pkg'), { recursive: true });
  mkdirSync(path.join(root, '.git'));
  writeFileSync(path.join(root, 'README.md'), '# Forge\n');
  writeFileSync(path.join(root, 'src', 'app.ts'), 'export {};\n');
  writeFileSync(path.join(root, 'node_modules', 'pkg', 'index.js'), 'module.exports = 1;\n');
  writeFileSync(path.join(root, '.git', 'config'), '[core]\n');
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('quickopen listFiles handler', () => {
  it('rejects unexpected arguments instead of touching the filesystem', async () => {
    await expect(quickOpenHandlers.listFiles('unexpected')).rejects.toThrow(/arguments/i);
  });

  it('walks the open workspace and returns relative POSIX paths', async () => {
    await workspaceHandlers.openFolder(root);

    const files = await quickOpenHandlers.listFiles();

    expect(files).toContain('README.md');
    expect(files).toContain('src/app.ts');
    expect(files.every((entry) => !entry.includes('\\'))).toBe(true);
    expect(files.some((entry) => entry.startsWith('node_modules/'))).toBe(false);
    expect(files.some((entry) => entry.startsWith('.git/'))).toBe(false);
  });
});
