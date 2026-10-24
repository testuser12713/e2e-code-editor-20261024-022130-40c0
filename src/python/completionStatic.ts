import {
  moduleMembers,
  PYTHON_BUILTINS,
  PYTHON_KEYWORDS,
  PYTHON_SNIPPETS,
  PYTHON_STDLIB_MODULES,
} from './completionData';
import type {
  PythonCompletionContext,
  PythonCompletionItem,
  PythonCompletionSource,
} from './completionData';

const MAIN_GUARD = '__main__';

function mainGuardRequested(prefix: string): boolean {
  if (prefix.length === 0) return false;
  return MAIN_GUARD.startsWith(prefix.toLowerCase());
}

function wordItems(context: PythonCompletionContext): PythonCompletionItem[] {
  const items: PythonCompletionItem[] = [
    ...PYTHON_KEYWORDS,
    ...PYTHON_BUILTINS,
    ...PYTHON_STDLIB_MODULES,
  ];

  for (const snippet of PYTHON_SNIPPETS) {
    if (snippet.label.includes(MAIN_GUARD) && !mainGuardRequested(context.prefix)) continue;
    items.push(snippet);
  }

  return items;
}

export const staticCompletionSource: PythonCompletionSource = {
  id: 'static',
  itemsFor: (context) => {
    switch (context.trigger) {
      case 'dot':
        return context.moduleName ? moduleMembers(context.moduleName) : [];
      case 'from':
      case 'import':
        return [...PYTHON_STDLIB_MODULES];
      case 'word':
        return wordItems(context);
      default:
        return [];
    }
  },
};
