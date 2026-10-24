import type * as Monaco from 'monaco-editor';

import { platform } from '../platform';
import type {
  PythonCompletionContext,
  PythonCompletionItem,
  PythonCompletionSource,
} from './completionData';

const completionSources: PythonCompletionSource[] = [];

export function registerCompletionSource(source: PythonCompletionSource): void {
  const index = completionSources.findIndex((candidate) => candidate.id === source.id);
  if (index === -1) {
    completionSources.push(source);
  } else {
    completionSources[index] = source;
  }
}

function contextFor(
  model: Monaco.editor.ITextModel,
  position: Monaco.Position,
  workspaceFiles: string[],
): PythonCompletionContext {
  const word = model.getWordUntilPosition(position);
  const prefix = word.word;
  const line = model.getLineContent(position.lineNumber);
  const beforeCursor = line.slice(0, Math.max(position.column - 1, 0));

  const dotMatch = /([A-Za-z_]\w*)\.\s*\w*$/.exec(beforeCursor);
  if (dotMatch) {
    return {
      trigger: 'dot',
      prefix,
      moduleName: dotMatch[1],
      documentText: model.getValue(),
      workspaceFiles,
    };
  }

  const fromMatch = /\bfrom\s+([\w.]*)$/.exec(beforeCursor);
  if (fromMatch) {
    return {
      trigger: 'from',
      prefix,
      moduleName: fromMatch[1].length > 0 ? fromMatch[1] : null,
      documentText: model.getValue(),
      workspaceFiles,
    };
  }

  const importMatch = /\bimport\s+([\w.]*)$/.exec(beforeCursor);
  if (importMatch) {
    return {
      trigger: 'import',
      prefix,
      moduleName: importMatch[1].length > 0 ? importMatch[1] : null,
      documentText: model.getValue(),
      workspaceFiles,
    };
  }

  return {
    trigger: 'word',
    prefix,
    moduleName: null,
    documentText: model.getValue(),
    workspaceFiles,
  };
}

function collectItems(context: PythonCompletionContext): PythonCompletionItem[] {
  const needle = context.prefix.toLowerCase();
  const byLabel = new Map<string, PythonCompletionItem>();

  for (const source of completionSources) {
    let items: PythonCompletionItem[] = [];
    try {
      items = source.itemsFor(context);
    } catch {
      items = [];
    }

    for (const item of items) {
      if (typeof item.label !== 'string' || item.label.length === 0) continue;
      if (needle.length > 0 && !item.label.toLowerCase().includes(needle)) continue;
      if (!byLabel.has(item.label)) byLabel.set(item.label, item);
    }
  }

  return Array.from(byLabel.values()).sort((left, right) => {
    if (left.sortGroup !== right.sortGroup) return left.sortGroup - right.sortGroup;
    const leftPrefix = left.label.toLowerCase().startsWith(needle) ? 0 : 1;
    const rightPrefix = right.label.toLowerCase().startsWith(needle) ? 0 : 1;
    if (leftPrefix !== rightPrefix) return leftPrefix - rightPrefix;
    return left.label.toLowerCase().localeCompare(right.label.toLowerCase());
  });
}

function completionKind(
  monaco: typeof import('monaco-editor'),
  kind: PythonCompletionItem['kind'],
): Monaco.languages.CompletionItemKind {
  const kinds = monaco.languages.CompletionItemKind;
  switch (kind) {
    case 'keyword':
      return kinds.Keyword;
    case 'builtin':
      return kinds.Function;
    case 'module':
      return kinds.Module;
    case 'function':
      return kinds.Function;
    case 'snippet':
      return kinds.Snippet;
    case 'variable':
      return kinds.Variable;
    default:
      return kinds.Text;
  }
}

export function registerPythonCompletion(
  monaco: typeof import('monaco-editor'),
): { dispose(): void } {
  const provider = monaco.languages.registerCompletionItemProvider('python', {
    triggerCharacters: ['.'],
    provideCompletionItems: async (model, position) => {
      let workspaceFiles: string[] = [];
      try {
        workspaceFiles = await platform.quickOpen.listFiles();
      } catch {
        workspaceFiles = [];
      }

      const context = contextFor(model, position, workspaceFiles);
      const items = collectItems(context);
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endLineNumber: position.lineNumber,
        endColumn: word.endColumn,
      };

      return {
        suggestions: items.map((item) => ({
          label: item.label,
          kind: completionKind(monaco, item.kind),
          detail: item.detail,
          documentation: item.documentation,
          insertText: item.insertText,
          range,
          sortText: `${String(item.sortGroup).padStart(3, '0')}-${item.label}`,
        })),
      };
    },
  });

  return {
    dispose: () => provider.dispose(),
  };
}
