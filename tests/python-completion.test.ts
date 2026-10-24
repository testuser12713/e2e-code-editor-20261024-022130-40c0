import { describe, expect, it } from 'vitest';

import {
  moduleMembers,
  PYTHON_BUILTINS,
  PYTHON_KEYWORDS,
  PYTHON_SNIPPETS,
  PYTHON_STDLIB_MEMBERS,
  PYTHON_STDLIB_MODULES,
} from '../src/python/completionData';
import type {
  PythonCompletionContext,
  PythonCompletionItem,
} from '../src/python/completionData';
import { staticCompletionSource } from '../src/python/completionStatic';

function context(overrides: Partial<PythonCompletionContext> = {}): PythonCompletionContext {
  return {
    trigger: 'word',
    prefix: '',
    moduleName: null,
    documentText: '',
    workspaceFiles: [],
    ...overrides,
  };
}

function labels(items: PythonCompletionItem[]): string[] {
  return items.map((item) => item.label);
}

const REQUIRED_MODULES = [
  'os',
  'sys',
  'math',
  'json',
  're',
  'random',
  'pathlib',
  'datetime',
  'collections',
  'itertools',
  'subprocess',
  'typing',
  'dataclasses',
];

describe('python completion data', () => {
  it('lists the Python keywords as keyword items', () => {
    const names = labels(PYTHON_KEYWORDS);

    for (const expected of ['def', 'class', 'for', 'if', 'elif', 'else', 'try', 'except', 'with', 'import', 'from', 'return']) {
      expect(names).toContain(expected);
    }
    for (const keyword of PYTHON_KEYWORDS) {
      expect(keyword.kind).toBe('keyword');
      expect(keyword.insertText).toBe(keyword.label);
      expect(keyword.sortGroup).toBeGreaterThanOrEqual(0);
    }
  });

  it('gives every builtin a signature detail and a description', () => {
    expect(PYTHON_BUILTINS.length).toBeGreaterThan(30);
    for (const builtin of PYTHON_BUILTINS) {
      expect(builtin.kind).toBe('builtin');
      expect(builtin.detail).toBeTruthy();
      expect(builtin.detail).toContain('(');
      expect(builtin.detail).toContain(')');
      expect(builtin.documentation).toBeTruthy();
      expect(builtin.insertText.length).toBeGreaterThan(0);
      expect(Number.isFinite(builtin.sortGroup)).toBe(true);
    }
  });

  it('carries the print entry with signature and description', () => {
    const print = PYTHON_BUILTINS.find((item) => item.label === 'print');

    expect(print).toBeDefined();
    expect(print?.detail).toBe("print(*values, sep=' ', end='\\n', file=None, flush=False)");
    expect(print?.documentation).toBeTruthy();
  });

  it('lists every required standard library module', () => {
    const names = labels(PYTHON_STDLIB_MODULES);

    for (const module of REQUIRED_MODULES) {
      expect(names).toContain(module);
    }
    for (const module of PYTHON_STDLIB_MODULES) {
      expect(module.kind).toBe('module');
      expect(module.insertText).toBe(module.label);
      expect(Number.isFinite(module.sortGroup)).toBe(true);
    }
  });

  it('resolves members for every listed stdlib module through moduleMembers', () => {
    for (const module of PYTHON_STDLIB_MODULES) {
      const members = moduleMembers(module.label);
      expect(members.length).toBeGreaterThan(0);
      for (const item of members) {
        expect(item.detail).toBeTruthy();
        expect(item.documentation).toBeTruthy();
        expect(Number.isFinite(item.sortGroup)).toBe(true);
      }
    }
    expect(Object.keys(PYTHON_STDLIB_MEMBERS)).toEqual(
      expect.arrayContaining(REQUIRED_MODULES),
    );
  });

  it('answers unknown modules with an empty member list', () => {
    expect(moduleMembers('not_a_module')).toEqual([]);
  });

  it('exposes math members with signatures and descriptions', () => {
    const members = moduleMembers('math');
    const names = labels(members);

    expect(names).toEqual(expect.arrayContaining(['sqrt', 'pi', 'floor']));
    for (const name of ['sqrt', 'pi', 'floor']) {
      const item = members.find((candidate) => candidate.label === name);
      expect(item?.detail).toBeTruthy();
      expect(item?.documentation).toBeTruthy();
    }
  });

  it('provides the required snippets', () => {
    const snippets = labels(PYTHON_SNIPPETS);

    expect(snippets.some((label) => label.startsWith('def '))).toBe(true);
    expect(snippets.some((label) => label.startsWith('class '))).toBe(true);
    expect(snippets.some((label) => label.startsWith('for '))).toBe(true);
    expect(snippets.some((label) => label.startsWith('if condition'))).toBe(true);
    expect(snippets.some((label) => label.startsWith('try:'))).toBe(true);
    expect(snippets.some((label) => label.startsWith('with open'))).toBe(true);
    expect(snippets).toContain('if __name__ == "__main__":');

    for (const snippet of PYTHON_SNIPPETS) {
      expect(snippet.kind).toBe('snippet');
      expect(snippet.insertText.length).toBeGreaterThan(0);
      expect(Number.isFinite(snippet.sortGroup)).toBe(true);
    }
  });
});

describe('static python completion source', () => {
  it('offers keywords and builtins on a word trigger', () => {
    const items = staticCompletionSource.itemsFor(context({ trigger: 'word', prefix: 'pri' }));
    const names = labels(items);

    expect(names).toContain('print');
    expect(names).toContain('def');
    expect(names).toContain('import');
  });

  it('includes the def snippet on a word trigger', () => {
    const items = staticCompletionSource.itemsFor(context({ trigger: 'word', prefix: '' }));

    expect(items.some((item) => item.kind === 'snippet' && item.label.startsWith('def '))).toBe(
      true,
    );
  });

  it('includes the __main__ snippet only once __main__ is typed', () => {
    const fresh = staticCompletionSource.itemsFor(context({ trigger: 'word', prefix: '' }));
    const typed = staticCompletionSource.itemsFor(
      context({ trigger: 'word', prefix: '__main__' }),
    );

    expect(fresh.some((item) => item.label.includes('__main__'))).toBe(false);
    expect(typed.some((item) => item.label.includes('__main__'))).toBe(true);
  });

  it('offers stdlib module names on the from and import triggers', () => {
    for (const trigger of ['from', 'import'] as const) {
      const names = labels(staticCompletionSource.itemsFor(context({ trigger })));
      for (const module of REQUIRED_MODULES) {
        expect(names).toContain(module);
      }
    }
  });

  it('offers math members on a dot trigger', () => {
    const items = staticCompletionSource.itemsFor(
      context({ trigger: 'dot', prefix: '', moduleName: 'math' }),
    );
    const names = labels(items);

    expect(names).toEqual(expect.arrayContaining(['sqrt', 'pi', 'floor', 'fsum', 'ceil']));
    const sqrt = items.find((item) => item.label === 'sqrt');
    expect(sqrt?.detail).toContain('sqrt(x)');
    expect(sqrt?.documentation).toBeTruthy();
  });

  it('offers no members for a dot trigger on an unknown name', () => {
    expect(
      staticCompletionSource.itemsFor(context({ trigger: 'dot', moduleName: 'shipments' })),
    ).toEqual([]);
    expect(staticCompletionSource.itemsFor(context({ trigger: 'dot', moduleName: null }))).toEqual(
      [],
    );
  });
});
