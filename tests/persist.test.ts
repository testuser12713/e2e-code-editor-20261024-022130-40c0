import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { OpResult, SessionState, Settings } from '../src/state/types';

const require = createRequire(import.meta.url);

type ReadSettingsResult = {
  status: 'ok' | 'missing' | 'invalid';
  settings: Settings;
  message: string | null;
};

type ReadSessionResult = {
  status: 'ok' | 'missing' | 'invalid';
  session: SessionState;
  message: string | null;
};

type ReadRecentFoldersResult = {
  status: 'ok' | 'missing' | 'invalid';
  folders: string[];
  message: string | null;
};

type PersistLib = {
  SETTINGS_FILE: string;
  SESSION_FILE: string;
  RECENT_FOLDERS_FILE: string;
  DEFAULT_SETTINGS: Settings;
  DEFAULT_SESSION: SessionState;
  defaultSettings: () => Settings;
  defaultSession: () => SessionState;
  normalizeSettings: (value: unknown) => Settings | null;
  normalizeSession: (value: unknown) => SessionState | null;
  normalizeRecentFolders: (value: unknown) => string[] | null;
  isAbsolutePathString: (value: unknown) => boolean;
  isRelativePathString: (value: unknown) => boolean;
  readSettings: (userDataDir: string) => ReadSettingsResult;
  readSession: (userDataDir: string) => ReadSessionResult;
  readRecentFolders: (userDataDir: string) => ReadRecentFoldersResult;
  writeSettings: (userDataDir: string, settings: unknown) => OpResult;
  writeSession: (userDataDir: string, session: unknown) => OpResult;
  addRecentFolder: (userDataDir: string, absPath: unknown) => OpResult;
  ensureLocalData: (userDataDir: string) => OpResult;
  clearLocalData: (userDataDir: string) => OpResult;
};

type PersistHandlers = {
  loadSettings: () => Promise<Settings>;
  saveSettings: (settings: unknown) => Promise<OpResult>;
  loadSession: () => Promise<SessionState>;
  saveSession: (session: unknown) => Promise<OpResult>;
  loadRecentFolders: () => Promise<string[]>;
  addRecentFolder: (absPath: unknown) => Promise<OpResult>;
  clearLocalData: () => Promise<OpResult>;
  userDataPath: () => Promise<string>;
};

const persist = require('../electron/lib/persist.cjs') as PersistLib;
const handlers = require('../electron/handlers/persist.cjs') as PersistHandlers;
const nodeFs = require('node:fs') as typeof import('node:fs');

let userDataDir = '';

function filePath(fileName: string): string {
  return path.join(userDataDir, fileName);
}

function readJson(fileName: string): unknown {
  return JSON.parse(readFileSync(filePath(fileName), 'utf8')) as unknown;
}

function temporaryFiles(): string[] {
  return readdirSync(userDataDir).filter((name) => name.endsWith('.tmp'));
}

function settings(overrides: Partial<Settings> = {}): Settings {
  return { ...persist.DEFAULT_SETTINGS, ...overrides };
}

beforeEach(() => {
  userDataDir = mkdtempSync(path.join(tmpdir(), 'forge-persist-'));
});

afterEach(() => {
  rmSync(userDataDir, { recursive: true, force: true });
});

describe('persist settings', () => {
  it('falls back to the documented defaults when the file is missing', () => {
    const result = persist.readSettings(userDataDir);

    expect(result.status).toBe('missing');
    expect(result.settings).toEqual(persist.DEFAULT_SETTINGS);
    expect(result.message).toBeTruthy();
  });

  it('falls back to the documented defaults with a readable message for corrupt JSON', () => {
    writeFileSync(filePath(persist.SETTINGS_FILE), '{ "theme": "dark", "fontSize": ');

    const result = persist.readSettings(userDataDir);

    expect(result.status).toBe('invalid');
    expect(result.settings).toEqual(persist.DEFAULT_SETTINGS);
    expect(typeof result.message).toBe('string');
    expect(result.message?.length).toBeGreaterThan(0);
  });

  it('falls back to the defaults with a readable message when the file cannot be read', () => {
    mkdirSync(filePath(persist.SETTINGS_FILE));

    const result = persist.readSettings(userDataDir);

    expect(result.status).toBe('invalid');
    expect(result.settings).toEqual(persist.DEFAULT_SETTINGS);
    expect(result.message).toBeTruthy();
  });

  it('falls back to the defaults for unexpected values instead of throwing', () => {
    writeFileSync(
      filePath(persist.SETTINGS_FILE),
      JSON.stringify({ theme: 'neon', fontSize: 99, tabSize: 3 }),
    );

    const result = persist.readSettings(userDataDir);

    expect(result.settings).toEqual(persist.DEFAULT_SETTINGS);
    expect(result.message).toBeTruthy();
  });

  it('round-trips settings and stores only the documented setting values', () => {
    const saved = settings({ theme: 'light', fontSize: 18, tabSize: 4, treeFontSize: 15 });
    const withExtras = {
      ...saved,
      recentFilePath: '/some/file.ts',
      fileContents: 'secret source code',
      telemetry: { event: 'launch' },
    };

    expect(persist.writeSettings(userDataDir, withExtras)).toEqual({ ok: true });

    const raw = readJson(persist.SETTINGS_FILE) as Record<string, unknown>;
    expect(Object.keys(raw).sort()).toEqual(
      ['fontSize', 'renderWhitespace', 'tabSize', 'theme', 'treeFontSize', 'wordWrap'].sort(),
    );
    expect(raw).toEqual(saved);

    const result = persist.readSettings(userDataDir);
    expect(result.status).toBe('ok');
    expect(result.settings).toEqual(saved);
  });

  it('rejects invalid settings without writing a file', () => {
    const result = persist.writeSettings(userDataDir, { theme: 'dark' });

    expect(result.ok).toBe(false);
    expect(readdirSync(userDataDir)).toEqual([]);
  });
});

describe('persist session', () => {
  it('round-trips a session with only file paths and cursor positions', () => {
    const session = {
      workspaceRoot: path.join(tmpdir(), 'forge-workspace'),
      tabs: [
        { relPath: 'src/app.ts', cursor: { line: 12, column: 4 }, content: 'secret' },
        { relPath: 'README.md', cursor: { line: 1, column: 1 } },
      ],
      activeRelPath: 'src/app.ts',
      telemetry: { clicks: 4 },
    };

    expect(persist.writeSession(userDataDir, session)).toEqual({ ok: true });

    const raw = readJson(persist.SESSION_FILE) as {
      workspaceRoot: string;
      tabs: Record<string, unknown>[];
      activeRelPath: string;
    };
    expect(Object.keys(raw).sort()).toEqual(['activeRelPath', 'tabs', 'workspaceRoot']);
    expect(raw.tabs).toHaveLength(2);
    expect(Object.keys(raw.tabs[0]).sort()).toEqual(['cursor', 'relPath']);
    expect(Object.keys(raw.tabs[0].cursor as Record<string, unknown>).sort()).toEqual([
      'column',
      'line',
    ]);

    const result = persist.readSession(userDataDir);
    expect(result.status).toBe('ok');
    expect(result.session).toEqual({
      workspaceRoot: session.workspaceRoot,
      tabs: [
        { relPath: 'src/app.ts', cursor: { line: 12, column: 4 } },
        { relPath: 'README.md', cursor: { line: 1, column: 1 } },
      ],
      activeRelPath: 'src/app.ts',
    });
  });

  it('falls back to an empty session when the file is corrupt', () => {
    writeFileSync(filePath(persist.SESSION_FILE), 'not json at all');

    const result = persist.readSession(userDataDir);

    expect(result.status).toBe('invalid');
    expect(result.session).toEqual(persist.DEFAULT_SESSION);
    expect(result.message).toBeTruthy();
  });

  it('rejects paths that escape the workspace and paths without a cursor', () => {
    const escaping = {
      workspaceRoot: null,
      tabs: [{ relPath: '../secret.txt', cursor: { line: 1, column: 1 } }],
      activeRelPath: null,
    };
    const missingCursor = {
      workspaceRoot: null,
      tabs: [{ relPath: 'src/app.ts' }],
      activeRelPath: null,
    };

    expect(persist.writeSession(userDataDir, escaping).ok).toBe(false);
    expect(persist.writeSession(userDataDir, missingCursor).ok).toBe(false);
    expect(readdirSync(userDataDir)).toEqual([]);
  });
});

describe('persist recent folders', () => {
  it('keeps the newest five absolute folders without duplicates', () => {
    const folders = Array.from({ length: 6 }, (_, index) =>
      path.join(tmpdir(), `forge-recent-${index + 1}`),
    );

    for (const folder of folders) {
      expect(persist.addRecentFolder(userDataDir, folder)).toEqual({ ok: true });
    }

    let result = persist.readRecentFolders(userDataDir);
    expect(result.folders).toHaveLength(5);
    expect(result.folders[0]).toBe(folders[5]);
    expect(result.folders).not.toContain(folders[0]);

    expect(persist.addRecentFolder(userDataDir, folders[2])).toEqual({ ok: true });

    result = persist.readRecentFolders(userDataDir);
    expect(result.folders).toHaveLength(5);
    expect(result.folders[0]).toBe(folders[2]);
    expect(new Set(result.folders).size).toBe(result.folders.length);
  });

  it('falls back to an empty list for corrupt content', () => {
    writeFileSync(filePath(persist.RECENT_FOLDERS_FILE), '["not-an-absolute-path"]');

    const result = persist.readRecentFolders(userDataDir);

    expect(result.folders).toEqual([]);
    expect(result.message).toBeTruthy();
  });

  it('rejects relative, empty, non-string and oversized paths without touching the disk', () => {
    expect(persist.addRecentFolder(userDataDir, 'relative/folder').ok).toBe(false);
    expect(persist.addRecentFolder(userDataDir, '').ok).toBe(false);
    expect(persist.addRecentFolder(userDataDir, 42).ok).toBe(false);
    expect(persist.addRecentFolder(userDataDir, path.join(tmpdir(), 'a'.repeat(5000))).ok).toBe(false);
    expect(readdirSync(userDataDir)).toEqual([]);
  });
});

describe('atomic writes', () => {
  it('keeps the previous content and leaves no temporary file when the rename fails', () => {
    const original = settings();
    const replacement = settings({ theme: 'light', fontSize: 20 });
    expect(persist.writeSettings(userDataDir, original)).toEqual({ ok: true });

    const originalRename = nodeFs.renameSync;
    let attempted = false;
    nodeFs.renameSync = () => {
      attempted = true;
      const error = new Error('EACCES: simulated rename failure') as NodeJS.ErrnoException;
      error.code = 'EACCES';
      throw error;
    };

    let result: OpResult;
    try {
      result = persist.writeSettings(userDataDir, replacement);
    } finally {
      nodeFs.renameSync = originalRename;
    }

    expect(attempted).toBe(true);
    expect(result.ok).toBe(false);
    expect(persist.readSettings(userDataDir).settings).toEqual(original);
    expect(temporaryFiles()).toEqual([]);
    expect(readdirSync(userDataDir).sort()).toEqual([persist.SETTINGS_FILE]);
  });

  it('writes the complete new content and removes the temporary file on success', () => {
    const saved = settings({ theme: 'light', fontSize: 22, wordWrap: true });

    expect(persist.writeSettings(userDataDir, saved)).toEqual({ ok: true });

    expect(temporaryFiles()).toEqual([]);
    expect(readJson(persist.SETTINGS_FILE)).toEqual(saved);
  });
});

describe('first start', () => {
  it('creates all three files with documented defaults and never overwrites existing data', () => {
    expect(persist.ensureLocalData(userDataDir)).toEqual({ ok: true });

    expect(readdirSync(userDataDir).sort()).toEqual(
      [persist.SETTINGS_FILE, persist.SESSION_FILE, persist.RECENT_FOLDERS_FILE].sort(),
    );
    expect(readJson(persist.SETTINGS_FILE)).toEqual(persist.DEFAULT_SETTINGS);
    expect(readJson(persist.SESSION_FILE)).toEqual(persist.DEFAULT_SESSION);
    expect(readJson(persist.RECENT_FOLDERS_FILE)).toEqual([]);

    writeFileSync(filePath(persist.SETTINGS_FILE), '{ broken');
    expect(persist.ensureLocalData(userDataDir)).toEqual({ ok: true });
    expect(readFileSync(filePath(persist.SETTINGS_FILE), 'utf8')).toBe('{ broken');
  });
});

describe('clear local data', () => {
  it('deletes the settings, session and recent folder files', () => {
    expect(persist.writeSettings(userDataDir, settings())).toEqual({ ok: true });
    expect(
      persist.writeSession(userDataDir, {
        workspaceRoot: null,
        tabs: [],
        activeRelPath: null,
      }),
    ).toEqual({ ok: true });
    expect(persist.addRecentFolder(userDataDir, path.join(tmpdir(), 'forge-recent'))).toEqual({
      ok: true,
    });

    expect(readdirSync(userDataDir).sort()).toEqual(
      [persist.SETTINGS_FILE, persist.SESSION_FILE, persist.RECENT_FOLDERS_FILE].sort(),
    );

    expect(persist.clearLocalData(userDataDir)).toEqual({ ok: true });
    expect(readdirSync(userDataDir)).toEqual([]);
  });

  it('succeeds when no local data exists yet', () => {
    expect(persist.clearLocalData(userDataDir)).toEqual({ ok: true });
  });
});

describe('persist handlers', () => {
  it('answers invalid settings with a readable failure instead of touching the disk', async () => {
    const invalid = [
      null,
      undefined,
      'settings',
      [],
      { ...settings(), theme: 'neon' },
      { ...settings(), fontSize: 9 },
      { ...settings(), tabSize: 3 },
      { ...settings(), wordWrap: 'yes' },
    ];

    for (const value of invalid) {
      const result = await handlers.saveSettings(value);
      expect(result.ok).toBe(false);
      expect(result).toHaveProperty('message');
      if (!result.ok) expect(result.message.length).toBeGreaterThan(0);
    }
  });

  it('answers invalid sessions with a readable failure', async () => {
    const invalid = [
      null,
      { workspaceRoot: 42, tabs: [], activeRelPath: null },
      { workspaceRoot: null, tabs: 'nope', activeRelPath: null },
      {
        workspaceRoot: null,
        tabs: [{ relPath: 'src/app.ts', cursor: { line: 0, column: 1 } }],
        activeRelPath: null,
      },
    ];

    for (const value of invalid) {
      const result = await handlers.saveSession(value);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.message.length).toBeGreaterThan(0);
    }
  });

  it('answers invalid recent folder arguments with a readable failure', async () => {
    const invalid = [null, undefined, '', 'relative/folder', 42, path.join(tmpdir(), 'a'.repeat(5000))];

    for (const value of invalid) {
      const result = await handlers.addRecentFolder(value);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.message.length).toBeGreaterThan(0);
    }
  });
});
