import { beforeEach, describe, expect, it, vi } from 'vitest';

import { platform } from '../src/platform';
import {
  registerCompletionSource,
  registerPythonCompletion,
} from '../src/python/completion';
import {
  documentCompletionItems,
  documentCompletionSource,
  workspaceImportItems,
} from '../src/python/documentSymbols';

type MonacoProvider = {
  provideCompletionItems(
    model: {
      getWordUntilPosition(position: { lineNumber: number; column: number }): {
        word: string;
        startColumn: number;
        endColumn: number;
      };
      getLineContent(lineNumber: number): string;
      getValue(): string;
    },
    position: { lineNumber: number; column: number },
  ): Promise<{ suggestions: { label: string; sortText: string }[] }>;
};

function createProvider(registerDocumentSource: boolean): MonacoProvider {
  let provider: MonacoProvider | null = null;

  if (registerDocumentSource) registerCompletionSource(documentCompletionSource);

  registerPythonCompletion({
    languages: {
      CompletionItemKind: {
        Keyword: 0,
        Function: 1,
        Module: 2,
        Snippet: 3,
        Variable: 4,
        Text: 5,
      },
      registerCompletionItemProvider: (_language: string, candidate: MonacoProvider) => {
        provider = candidate;
        return { dispose: () => undefined };
      },
    },
  } as unknown as typeof import('monaco-editor'));

  if (provider === null) throw new Error('completion provider was not registered');
  return provider;
}

function modelFor(text: string, line: string, prefix: string) {
  return {
    getWordUntilPosition: () => ({
      word: prefix,
      startColumn: 1,
      endColumn: prefix.length + 1,
    }),
    getLineContent: () => line,
    getValue: () => text,
  };
}

async function suggest(
  provider: MonacoProvider,
  text: string,
  line: string,
  prefix: string,
  column: number = prefix.length + 1,
): Promise<string[]> {
  const result = await provider.provideCompletionItems(modelFor(text, line, prefix), {
    lineNumber: 1,
    column,
  });
  return result.suggestions.map((suggestion) => suggestion.label);
}

describe('documentCompletionItems', () => {
  it('extracts def, async def and class names at any indentation', () => {
    const text = [
      'class Shipment:',
      '    def __init__(self, weight):',
      '        self.weight = weight',
      '',
      '    async def refresh(self):',
      '        return self.weight',
      '',
      'def print_receipt(shipment: Shipment) -> None:',
      '    print(shipment)',
    ].join('\n');

    const items = documentCompletionItems(text);
    const definitions = items.filter((item) => item.kind === 'function');

    expect(definitions.map((item) => item.label)).toEqual([
      'Shipment',
      '__init__',
      'refresh',
      'print_receipt',
    ]);
    expect(definitions.find((item) => item.label === 'print_receipt')?.detail).toBe(
      'print_receipt(shipment: Shipment) -> None',
    );
  });

  it('offers the words used in the file as variables without keywords', () => {
    const text = ['def total(weight):', '    return weight * 2'].join('\n');

    const items = documentCompletionItems(text);
    const variables = items.filter((item) => item.kind === 'variable');

    expect(variables.map((item) => item.label)).toEqual(['weight']);
    expect(items.some((item) => item.label === 'def')).toBe(false);
    expect(items.some((item) => item.label === 'return')).toBe(false);
  });

  it('deduplicates names defined in the file and used as words', () => {
    const text = ['def print_receipt():', '    print_receipt()'].join('\n');

    const items = documentCompletionItems(text);
    const matches = items.filter((item) => item.label === 'print_receipt');

    expect(matches).toHaveLength(1);
    expect(matches[0].kind).toBe('function');
  });
});

describe('workspaceImportItems', () => {
  it('turns workspace .py paths into dotted module names', () => {
    const items = workspaceImportItems([
      'reports/receipts.py',
      'cli_tools.py',
      'pkg/nested/module.py',
      'notes.md',
      'src/App.tsx',
    ]);

    expect(items.map((item) => item.label)).toEqual([
      'reports.receipts',
      'cli_tools',
      'pkg.nested.module',
    ]);
    expect(items.every((item) => item.kind === 'module')).toBe(true);
    expect(items.find((item) => item.label === 'reports.receipts')?.detail).toBe(
      'reports/receipts.py',
    );
  });

  it('accepts Windows separators and skips paths outside the workspace', () => {
    const items = workspaceImportItems([
      'reports\\receipts.py',
      '../outside.py',
      '/absolute/script.py',
      'C:\\temp\\script.py',
    ]);

    expect(items.map((item) => item.label)).toEqual(['reports.receipts']);
  });

  it('deduplicates module names coming from duplicate entries', () => {
    const items = workspaceImportItems(['pkg/tool.py', './pkg/tool.py']);

    expect(items.map((item) => item.label)).toEqual(['pkg.tool']);
  });
});

describe('documentCompletionSource trigger gating', () => {
  const text = ['def print_receipt(shipment):', '    print(shipment)'].join('\n');
  const files = ['reports/receipts.py', 'cli_tools.py'];

  it('offers document symbols and words on a word trigger', () => {
    const items = documentCompletionSource.itemsFor({
      trigger: 'word',
      prefix: 'pri',
      moduleName: null,
      documentText: text,
      workspaceFiles: files,
    });

    expect(items.map((item) => item.label)).toContain('print_receipt');
    expect(items.map((item) => item.label)).toContain('shipment');
    expect(items.map((item) => item.label)).not.toContain('reports.receipts');
  });

  it('offers workspace modules after from and import only', () => {
    for (const trigger of ['from', 'import'] as const) {
      const items = documentCompletionSource.itemsFor({
        trigger,
        prefix: '',
        moduleName: null,
        documentText: text,
        workspaceFiles: files,
      });

      expect(items.map((item) => item.label)).toEqual([
        'reports.receipts',
        'cli_tools',
      ]);
    }
  });

  it('offers nothing after a dot', () => {
    const items = documentCompletionSource.itemsFor({
      trigger: 'dot',
      prefix: '',
      moduleName: 'math',
      documentText: text,
      workspaceFiles: files,
    });

    expect(items).toEqual([]);
  });
});

describe('completion order across the sources', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    registerCompletionSource({
      id: 'test-builtins',
      itemsFor: () => [
        {
          label: 'print',
          kind: 'builtin',
          detail: "print(*values, sep=' ', end='\\n')",
          insertText: 'print',
          sortGroup: 0,
        },
        {
          label: 'pretty',
          kind: 'builtin',
          insertText: 'pretty',
          sortGroup: 0,
        },
      ],
    });
  });

  it('keeps builtins ahead of document symbols and prefix matches ahead of substrings', async () => {
    vi.spyOn(platform.quickOpen, 'listFiles').mockResolvedValue([]);
    const provider = createProvider(true);
    const text = [
      'def sprint() -> None:',
      '    pass',
      '',
      'def print_receipt(shipment) -> None:',
      '    print(shipment)',
    ].join('\n');

    const labels = await suggest(provider, text, 'pri', 'pri');

    expect(labels).toEqual(['print', 'print_receipt', 'sprint']);
    expect(labels.indexOf('print_receipt')).toBeLessThan(labels.indexOf('sprint'));
  });

  it('suggests workspace .py modules after from alongside the standard library', async () => {
    vi.spyOn(platform.quickOpen, 'listFiles').mockResolvedValue([
      'reports/receipts.py',
      'cli_tools.py',
      'README.md',
    ]);
    const provider = createProvider(true);
    const text = 'from ';

    const labels = await suggest(provider, text, 'from ', '', 6);

    expect(labels).toContain('reports.receipts');
    expect(labels).toContain('cli_tools');
    expect(labels).not.toContain('README.md');
    expect(labels).not.toContain('sprint');
  });
});
