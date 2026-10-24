import { PYTHON_KEYWORDS } from './completionData';
import type {
  PythonCompletionContext,
  PythonCompletionItem,
  PythonCompletionSource,
} from './completionData';

export const WORKSPACE_MODULE_SORT_GROUP = 40;
export const DOCUMENT_SYMBOL_SORT_GROUP = 50;

const DEFINITION_PATTERN =
  /^[ \t]*(?:(?:async\s+)?def[ \t]+([A-Za-z_]\w*)([^\n]*)|class[ \t]+([A-Za-z_]\w*))/gm;

const WORD_PATTERN = /[A-Za-z_][A-Za-z0-9_]*/g;

const STRUCTURAL_KEYWORDS = [
  'False',
  'None',
  'True',
  'and',
  'as',
  'assert',
  'async',
  'await',
  'break',
  'class',
  'continue',
  'def',
  'del',
  'elif',
  'else',
  'except',
  'finally',
  'for',
  'from',
  'global',
  'if',
  'import',
  'in',
  'is',
  'lambda',
  'nonlocal',
  'not',
  'or',
  'pass',
  'raise',
  'return',
  'try',
  'while',
  'with',
  'yield',
];

const PYTHON_WORD_EXCLUSIONS = new Set<string>([
  ...PYTHON_KEYWORDS.map((item) => item.label),
  ...STRUCTURAL_KEYWORDS,
]);

function definitionItems(text: string): PythonCompletionItem[] {
  const items: PythonCompletionItem[] = [];
  DEFINITION_PATTERN.lastIndex = 0;

  let match = DEFINITION_PATTERN.exec(text);
  while (match !== null) {
    if (match[1] !== undefined) {
      const name = match[1];
      const rawSignature = (match[2] ?? '')
        .replace(/\s*#.*$/, '')
        .trim()
        .replace(/:\s*$/, '');
      const signature = rawSignature.length > 0 ? rawSignature : '()';
      items.push({
        label: name,
        kind: 'function',
        detail: `${name}${signature}`,
        documentation: 'Function defined in this file',
        insertText: name,
        sortGroup: DOCUMENT_SYMBOL_SORT_GROUP,
      });
    } else if (match[3] !== undefined) {
      const name = match[3];
      items.push({
        label: name,
        kind: 'function',
        detail: `class ${name}`,
        documentation: 'Class defined in this file',
        insertText: name,
        sortGroup: DOCUMENT_SYMBOL_SORT_GROUP,
      });
    }

    match = DEFINITION_PATTERN.exec(text);
  }

  return items;
}

export function documentCompletionItems(text: string): PythonCompletionItem[] {
  const items = definitionItems(text);
  const seen = new Set(items.map((item) => item.label));

  WORD_PATTERN.lastIndex = 0;
  let match = WORD_PATTERN.exec(text);
  while (match !== null) {
    const word = match[0];
    if (!PYTHON_WORD_EXCLUSIONS.has(word) && !seen.has(word)) {
      seen.add(word);
      items.push({
        label: word,
        kind: 'variable',
        detail: 'Used in this file',
        insertText: word,
        sortGroup: DOCUMENT_SYMBOL_SORT_GROUP,
      });
    }
    match = WORD_PATTERN.exec(text);
  }

  return items;
}

function normalizeModulePath(file: string): string | null {
  const normalized = file.replace(/\\/g, '/').replace(/^\.\//, '');
  if (!normalized.toLowerCase().endsWith('.py')) return null;
  if (normalized.startsWith('/') || /^[A-Za-z]:/.test(normalized)) return null;

  const segments = normalized.slice(0, -3).split('/');
  if (segments.length === 0 || segments.some((segment) => segment.length === 0)) {
    return null;
  }
  if (segments.some((segment) => segment === '.' || segment === '..')) return null;

  return normalized;
}

export function workspaceImportItems(files: string[]): PythonCompletionItem[] {
  const items: PythonCompletionItem[] = [];
  const seen = new Set<string>();

  for (const file of files) {
    const normalized = normalizeModulePath(file);
    if (normalized === null) continue;

    const moduleName = normalized.slice(0, -3).split('/').join('.');
    if (seen.has(moduleName)) continue;
    seen.add(moduleName);

    items.push({
      label: moduleName,
      kind: 'module',
      detail: normalized,
      documentation: 'Python module in this workspace',
      insertText: moduleName,
      sortGroup: WORKSPACE_MODULE_SORT_GROUP,
    });
  }

  return items;
}

export const documentCompletionSource: PythonCompletionSource = {
  id: 'document-symbols',
  itemsFor: (context: PythonCompletionContext) => {
    if (context.trigger === 'from' || context.trigger === 'import') {
      return workspaceImportItems(context.workspaceFiles);
    }
    if (context.trigger === 'word') {
      return documentCompletionItems(context.documentText);
    }
    return [];
  },
};
