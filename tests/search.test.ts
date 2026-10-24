import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { SearchQuery, SearchResultGroup } from '../src/state/types';

const require = createRequire(import.meta.url);

type SearchOptions = { maxHits?: number; isCancelled?: () => boolean };

const { searchWorkspace } = require('../electron/lib/search.cjs') as {
  searchWorkspace: (
    rootAbs: string,
    query: SearchQuery,
    options?: SearchOptions,
  ) => Promise<SearchResultGroup[]>;
};

const handlers = require('../electron/handlers/search.cjs') as {
  run: (query: unknown, searchId: unknown) => Promise<SearchResultGroup[]>;
  cancel: (searchId: unknown) => Promise<void>;
};

const workspaceHandlers = require('../electron/handlers/workspace.cjs') as {
  openFolder: (absPath: unknown) => Promise<{ ok: boolean }>;
};

let root = '';

function query(overrides: Partial<SearchQuery> = {}): SearchQuery {
  return {
    text: 'save',
    caseSensitive: false,
    wholeWord: false,
    regex: false,
    ...overrides,
  };
}

function hitsOf(groups: SearchResultGroup[]) {
  return groups.flatMap((group) => group.hits);
}

function fileOf(groups: SearchResultGroup[], relPath: string) {
  return groups.find((group) => group.relPath === relPath);
}

beforeAll(() => {
  root = mkdtempSync(path.join(tmpdir(), 'forge-search-'));

  mkdirSync(path.join(root, 'src'));
  mkdirSync(path.join(root, 'docs'));

  writeFileSync(path.join(root, 'binary.dat'), Buffer.from([0, 1, 2, 3, 4, 5]));
  writeFileSync(
    path.join(root, 'src', 'session.ts'),
    [
      'export function saveSession() {',
      '  return save();',
      '}',
      "const SAVE = 'Save';",
      '// save saveSession saved',
      '',
    ].join('\n'),
  );
  writeFileSync(
    path.join(root, 'docs', 'guide.md'),
    ['# Save the session', 'Call save twice: save', ''].join('\n'),
  );
  writeFileSync(
    path.join(root, 'src', 'utils.ts'),
    ['export const savepoint = 1;', 'export const value = Math.max(1, 2);', ''].join('\n'),
  );
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('searchWorkspace', () => {
  it('matches case-sensitively when requested', async () => {
    const groups = await searchWorkspace(root, query({ caseSensitive: true }));
    const hits = hitsOf(groups);

    expect(hits).toHaveLength(8);
    expect(hits.every((hit) => !hit.lineText.includes('SAVE'))).toBe(true);
    expect(hits.some((hit) => hit.lineText.includes('Save'))).toBe(false);
  });

  it('matches case-insensitively by default', async () => {
    const groups = await searchWorkspace(root, query());

    expect(hitsOf(groups)).toHaveLength(11);
    const guide = fileOf(groups, 'docs/guide.md');
    expect(guide?.hits.some((hit) => hit.lineText.includes('Save'))).toBe(true);
  });

  it('honours the whole-word switch', async () => {
    const groups = await searchWorkspace(root, query({ caseSensitive: true, wholeWord: true }));
    const hits = hitsOf(groups);

    expect(hits).toHaveLength(4);
    const matchedText = hits.map((hit) => hit.lineText.slice(hit.column - 1, hit.column - 1 + hit.matchLength));
    expect(matchedText.every((text) => text.toLowerCase() === 'save')).toBe(true);
    expect(fileOf(groups, 'src/utils.ts')).toBeUndefined();
  });

  it('runs the regular expression when the regex switch is on', async () => {
    const groups = await searchWorkspace(
      root,
      query({ text: '^export', caseSensitive: true, regex: true }),
    );
    const hits = hitsOf(groups);

    expect(hits).toHaveLength(3);
    expect(hits.every((hit) => hit.lineText.startsWith('export'))).toBe(true);
    expect(hits.every((hit) => hit.matchLength === 6)).toBe(true);
  });

  it('treats the query literally when the regex switch is off', async () => {
    const groups = await searchWorkspace(root, query({ text: '.', caseSensitive: false }));
    const hits = hitsOf(groups);

    expect(hits).toHaveLength(1);
    const hit = hits[0];
    expect(hit.lineText).toContain('Math.max');
    expect(hit.line).toBe(2);
    expect(hit.column).toBe(hit.lineText.indexOf('.') + 1);
    expect(hit.matchLength).toBe(1);
  });

  it('rejects an invalid regular expression', async () => {
    await expect(
      searchWorkspace(root, query({ text: '[', regex: true })),
    ).rejects.toThrow('regular expression');
  });

  it('groups hits per file with 1-based line and column', async () => {
    const groups = await searchWorkspace(root, query({ caseSensitive: true }));

    expect(groups.map((group) => group.relPath).sort()).toEqual([
      'docs/guide.md',
      'src/session.ts',
      'src/utils.ts',
    ]);

    for (const group of groups) {
      expect(group.hits.length).toBeGreaterThan(0);
      for (const hit of group.hits) {
        expect(hit.relPath).toBe(group.relPath);
        expect(hit.line).toBeGreaterThanOrEqual(1);
        expect(hit.column).toBeGreaterThanOrEqual(1);
        expect(hit.matchLength).toBe(4);
        expect(hit.lineText).toContain('save');
      }
    }

    expect(hitsOf(groups)).toHaveLength(8);
    const session = fileOf(groups, 'src/session.ts');
    expect(session?.hits.map((hit) => hit.line)).toEqual([1, 2, 5, 5, 5]);
  });

  it('stops scanning when the search is cancelled', async () => {
    const cancelRoot = mkdtempSync(path.join(tmpdir(), 'forge-search-cancel-'));
    writeFileSync(path.join(cancelRoot, 'a.txt'), 'needle\n');
    writeFileSync(path.join(cancelRoot, 'b.txt'), 'needle\n');
    writeFileSync(path.join(cancelRoot, 'c.txt'), 'needle\n');

    try {
      let checks = 0;
      const groups = await searchWorkspace(
        cancelRoot,
        query({ text: 'needle' }),
        {
          isCancelled: () => {
            checks += 1;
            return checks > 1;
          },
        },
      );

      expect(checks).toBe(2);
      expect(groups.map((group) => group.relPath)).toEqual(['a.txt']);
    } finally {
      rmSync(cancelRoot, { recursive: true, force: true });
    }
  });

  it('returns nothing when cancelled before the first file', async () => {
    const groups = await searchWorkspace(root, query(), { isCancelled: () => true });
    expect(groups).toEqual([]);
  });
});

describe('search handler', () => {
  it('rejects invalid arguments instead of touching the file system', async () => {
    await expect(handlers.run(null, 'search-invalid')).rejects.toThrow('query');
    await expect(
      handlers.run({ text: 'save', caseSensitive: 'yes', wholeWord: false, regex: false }, 'search-invalid'),
    ).rejects.toThrow('booleans');
    await expect(
      handlers.run({ text: 'save', caseSensitive: false, wholeWord: false, regex: false }, ''),
    ).rejects.toThrow('search id');
  });

  it('searches the open workspace and groups the result', async () => {
    const opened = await workspaceHandlers.openFolder(root);
    expect(opened.ok).toBe(true);

    const groups = await handlers.run(
      { text: '^export', caseSensitive: true, wholeWord: false, regex: true },
      'search-handler-1',
    );

    expect(groups.map((group) => group.relPath).sort()).toEqual([
      'src/session.ts',
      'src/utils.ts',
    ]);
    expect(hitsOf(groups)).toHaveLength(3);

    await handlers.cancel('search-handler-1');
  });
});
