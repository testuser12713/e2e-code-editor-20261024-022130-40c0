export type PythonCompletionItem = {
  label: string;
  kind: 'keyword' | 'builtin' | 'module' | 'function' | 'snippet' | 'variable';
  detail?: string;
  documentation?: string;
  insertText: string;
  sortGroup: number;
};

export type PythonCompletionContext = {
  trigger: 'word' | 'dot' | 'from' | 'import';
  prefix: string;
  moduleName: string | null;
  documentText: string;
  workspaceFiles: string[];
};

export type PythonCompletionSource = {
  id: string;
  itemsFor(context: PythonCompletionContext): PythonCompletionItem[];
};

export const PYTHON_KEYWORDS: PythonCompletionItem[] = [];
export const PYTHON_BUILTINS: PythonCompletionItem[] = [];
export const PYTHON_STDLIB_MODULES: PythonCompletionItem[] = [];
export const PYTHON_STDLIB_MEMBERS: Record<string, PythonCompletionItem[]> = {};
export const PYTHON_SNIPPETS: PythonCompletionItem[] = [];

export function moduleMembers(name: string): PythonCompletionItem[] {
  void name;
  return [];
}
