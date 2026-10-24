import type {
  OpResult,
  PlatformApi,
  ReadFileResult,
  SearchQuery,
  SearchResultGroup,
  SessionState,
  Settings,
  TreeNode,
} from './state/types';

const DEMO_ROOT = '/demo';

const DEMO_FILES: Record<string, string> = {
  'README.md': [
    '# Forge demo workspace',
    '',
    'This in-memory folder is available when Forge runs in a plain browser,',
    'without the Electron preload bridge. It is read-only: nothing here is',
    'written to disk.',
    '',
    'Open a file from the explorer to inspect its contents in the demo.',
    '',
  ].join('\n'),
  'package.json': [
    '{',
    '  "name": "forge-demo",',
    '  "version": "0.1.0",',
    '  "private": true,',
    '  "scripts": {',
    '    "build": "vite build"',
    '  }',
    '}',
    '',
  ].join('\n'),
  'tsconfig.json': [
    '{',
    '  "compilerOptions": {',
    '    "target": "ES2022",',
    '    "module": "ESNext",',
    '    "strict": true',
    '  }',
    '}',
    '',
  ].join('\n'),
  'src/index.ts': [
    "import { formatGreeting } from './utils';",
    '',
    'export function greet(name: string): string {',
    '  return formatGreeting(name);',
    '}',
    '',
    "console.log(greet('Forge'));",
    '',
  ].join('\n'),
  'src/utils.ts': [
    'export function formatGreeting(name: string): string {',
    '  return `Hello, ${name}!`;',
    '}',
    '',
    'export function clamp(value: number, min: number, max: number): number {',
    '  return Math.min(Math.max(value, min), max);',
    '}',
    '',
  ].join('\n'),
  'src/config.json': [
    '{',
    '  "theme": "dark",',
    '  "fontSize": 14,',
    '  "tabSize": 2,',
    '  "wordWrap": false',
    '}',
    '',
  ].join('\n'),
  'docs/guide.md': [
    '# Guide',
    '',
    'Forge keeps every file inside the folder you open. The demo workspace',
    'shows how the tree, tabs and editor behave without touching the file',
    'system.',
    '',
    'Use the activity bar to switch between Explorer, Search and Settings.',
    '',
  ].join('\n'),
  'docs/architecture.md': [
    '# Architecture',
    '',
    '- The renderer never imports Node modules.',
    '- Every file operation crosses the preload bridge.',
    '- The main process resolves every path against the workspace root.',
    '',
  ].join('\n'),
};

const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  js: 'JavaScript',
  jsx: 'JavaScript',
  ts: 'TypeScript',
  tsx: 'TypeScript',
  json: 'JSON',
  html: 'HTML',
  css: 'CSS',
  scss: 'SCSS',
  py: 'Python',
  md: 'Markdown',
  sh: 'Shell',
  yml: 'YAML',
  yaml: 'YAML',
  xml: 'XML',
};

const SETTINGS_KEY = 'forge.settings';
const SESSION_KEY = 'forge.session';
const RECENT_KEY = 'forge.recentFolders';

function languageForPath(relPath: string): string {
  const extension = relPath.split('.').pop()?.toLowerCase() ?? '';
  return LANGUAGE_BY_EXTENSION[extension] ?? 'Plain Text';
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function safeParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as T) : null;
  } catch {
    return null;
  }
}

function storage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

function demoNodes(relPath: string): TreeNode[] {
  const clean = relPath.replace(/^\/+|\/+$/g, '');
  const prefix = clean ? `${clean}/` : '';
  const directories = new Set<string>();
  const files = new Set<string>();

  for (const filePath of Object.keys(DEMO_FILES)) {
    if (!filePath.startsWith(prefix)) continue;
    const remainder = filePath.slice(prefix.length);
    const separator = remainder.indexOf('/');
    if (separator === -1) {
      files.add(remainder);
    } else {
      directories.add(remainder.slice(0, separator));
    }
  }

  const nodes: TreeNode[] = [];
  for (const name of Array.from(directories).sort()) {
    nodes.push({ name, relPath: prefix + name, kind: 'dir' });
  }
  for (const name of Array.from(files).sort()) {
    nodes.push({ name, relPath: prefix + name, kind: 'file' });
  }
  return nodes;
}

function demoRead(relPath: string): ReadFileResult {
  if (typeof relPath !== 'string' || relPath.includes('..')) {
    return { ok: false, reason: 'outside-workspace', message: 'The path is outside the demo workspace.' };
  }
  const clean = relPath.replace(/^\/+/, '');
  const content = DEMO_FILES[clean];
  if (content === undefined) {
    return { ok: false, reason: 'not-found', message: `The file ${relPath} does not exist in the demo workspace.` };
  }
  return {
    ok: true,
    content,
    eol: content.includes('\r\n') ? 'crlf' : 'lf',
    encoding: 'utf-8',
    language: languageForPath(clean),
  };
}

function demoSearch(query: SearchQuery): SearchResultGroup[] {
  if (query.text.length === 0) return [];

  const source = query.regex ? query.text : escapeRegExp(query.text);
  const pattern = query.wholeWord ? `\\b(?:${source})\\b` : source;

  let matcher: RegExp;
  try {
    matcher = new RegExp(pattern, query.caseSensitive ? 'g' : 'gi');
  } catch {
    return [];
  }

  const groups: SearchResultGroup[] = [];
  for (const relPath of Object.keys(DEMO_FILES).sort()) {
    const lines = DEMO_FILES[relPath].split(/\r?\n/);
    const hits = [];

    for (let index = 0; index < lines.length; index += 1) {
      const lineText = lines[index];
      matcher.lastIndex = 0;
      let match = matcher.exec(lineText);
      while (match) {
        hits.push({
          relPath,
          line: index + 1,
          column: match.index + 1,
          lineText,
          matchLength: Math.max(match[0].length, 1),
        });
        if (match[0].length === 0) matcher.lastIndex += 1;
        match = matcher.exec(lineText);
      }
    }

    if (hits.length > 0) groups.push({ relPath, hits });
  }
  return groups;
}

function createBrowserFallback(): PlatformApi {
  let demoRoot: string | null = null;

  const storageUnavailable: OpResult = {
    ok: false,
    message: 'Local persistence is not available in this browser.',
  };

  return {
    workspace: {
      openDialog: async () => DEMO_ROOT,
      openFolder: async (absPath) => {
        if (absPath !== DEMO_ROOT) {
          return { ok: false, message: 'The browser demo only opens the in-memory /demo workspace.' };
        }
        demoRoot = DEMO_ROOT;
        return { ok: true };
      },
      getRoot: async () => demoRoot,
      listDir: async (relPath) => demoNodes(relPath),
    },
    files: {
      read: async (relPath) => demoRead(relPath),
      write: async () => ({ ok: false, message: 'Writing files requires the desktop application.' }),
    },
    manage: {
      create: async () => ({ ok: false, message: 'Creating files requires the desktop application.' }),
      rename: async () => ({ ok: false, message: 'Renaming requires the desktop application.' }),
      remove: async () => ({ ok: false, message: 'Deleting requires the desktop application.' }),
    },
    quickOpen: {
      listFiles: async () => Object.keys(DEMO_FILES).sort(),
    },
    search: {
      run: async (query) => demoSearch(query),
      cancel: async () => undefined,
    },
    persist: {
      loadSettings: async () => safeParse<Settings>(storage()?.getItem(SETTINGS_KEY) ?? null),
      saveSettings: async (settings) => {
        const store = storage();
        if (!store) return storageUnavailable;
        store.setItem(SETTINGS_KEY, JSON.stringify(settings));
        return { ok: true };
      },
      loadSession: async () => safeParse<SessionState>(storage()?.getItem(SESSION_KEY) ?? null),
      saveSession: async (session) => {
        const store = storage();
        if (!store) return storageUnavailable;
        store.setItem(SESSION_KEY, JSON.stringify(session));
        return { ok: true };
      },
      loadRecentFolders: async () => {
        const parsed = safeParse<string[]>(storage()?.getItem(RECENT_KEY) ?? null);
        return Array.isArray(parsed) ? parsed.filter((entry) => typeof entry === 'string').slice(0, 5) : [];
      },
      addRecentFolder: async (absPath) => {
        if (typeof absPath !== 'string' || absPath.length === 0) return;
        const store = storage();
        if (!store) return;
        const current = safeParse<string[]>(store.getItem(RECENT_KEY) ?? null);
        const list = Array.isArray(current) ? current.filter((entry) => typeof entry === 'string') : [];
        const next = [absPath, ...list.filter((entry) => entry !== absPath)].slice(0, 5);
        store.setItem(RECENT_KEY, JSON.stringify(next));
      },
      clearLocalData: async () => {
        const store = storage();
        if (!store) return storageUnavailable;
        store.removeItem(SETTINGS_KEY);
        store.removeItem(SESSION_KEY);
        store.removeItem(RECENT_KEY);
        return { ok: true };
      },
      userDataPath: async () => 'browser local storage',
    },
    app: {
      openExternal: async (url) => {
        if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
          throw new Error('Only http(s) URLs can be opened externally.');
        }
        window.open(url, '_blank', 'noopener,noreferrer');
      },
      onBeforeClose: () => () => undefined,
      confirmClose: () => undefined,
    },
    menu: {
      setMenuState: () => undefined,
      onCommand: () => () => undefined,
    },
  };
}

declare global {
  interface Window {
    api?: PlatformApi;
  }
}

function resolvePlatform(): PlatformApi {
  if (typeof window !== 'undefined' && window.api) {
    return window.api;
  }
  return createBrowserFallback();
}

export const platform: PlatformApi = resolvePlatform();
export const hasDesktopBridge = typeof window !== 'undefined' && Boolean(window.api);
export { DEMO_ROOT };
