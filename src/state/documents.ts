import { COMMAND_IDS, COMMAND_KEYBINDINGS } from '../commands/ids';
import { registerCommands } from '../commands/registry';
import { platform } from '../platform';
import { notify } from '../ui/Notify';
import { appStore } from './store';
import type { DocumentStatus, EditorApi } from './types';

let editorApi: EditorApi | null = null;

export type { EditorApi };

export type DocumentEntry = {
  content: string;
  eol: 'lf' | 'crlf';
  language: string;
  cursor: { line: number; column: number };
};

const documents = new Map<string, DocumentEntry>();

const MONACO_BY_LANGUAGE: Record<string, string> = {
  JavaScript: 'javascript',
  TypeScript: 'typescript',
  JSON: 'json',
  HTML: 'html',
  CSS: 'css',
  SCSS: 'scss',
  Python: 'python',
  Markdown: 'markdown',
  Shell: 'shell',
  YAML: 'yaml',
  XML: 'xml',
  'Plain Text': 'plaintext',
};

const LANGUAGE_BY_MONACO: Record<string, string> = Object.fromEntries(
  Object.entries(MONACO_BY_LANGUAGE).map(([display, id]) => [id, display]),
);

function displayLanguage(language: string): string {
  return MONACO_BY_LANGUAGE[language] ? language : LANGUAGE_BY_MONACO[language] ?? 'Plain Text';
}

function monacoLanguage(language: string): string {
  return MONACO_BY_LANGUAGE[displayLanguage(language)] ?? 'plaintext';
}

function baseName(relPath: string): string {
  const normalized = relPath.replace(/\\/g, '/');
  return normalized.split('/').pop() || normalized;
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.length > 0) return error.message;
  if (typeof error === 'string' && error.length > 0) return error;
  return fallback;
}

function normalizePosition(position?: { line: number; column: number }): { line: number; column: number } {
  const line = position && Number.isInteger(position.line) && position.line > 0 ? position.line : 1;
  const column = position && Number.isInteger(position.column) && position.column > 0 ? position.column : 1;
  return { line, column };
}

function statusFor(tabId: string): Partial<DocumentStatus> | null {
  const state = appStore.getState();
  const tab = state.tabs.tabs.find((candidate) => candidate.id === tabId);
  const entry = documents.get(tabId);
  if (!tab) return null;
  return {
    relPath: tab.relPath,
    language: entry ? entry.language : 'Plain Text',
    line: entry ? entry.cursor.line : 1,
    column: entry ? entry.cursor.column : 1,
    indentMode: 'spaces',
    indentSize: state.settings.tabSize,
    eol: entry ? entry.eol : 'lf',
    encoding: 'utf-8',
  };
}

function publishStatus(tabId: string | null): void {
  if (tabId) {
    const status = statusFor(tabId);
    if (status) {
      appStore.dispatch({ type: 'status/update', status });
      return;
    }
  }
  appStore.dispatch({ type: 'status/reset' });
}

export function getDocumentEntry(tabId: string): DocumentEntry | null {
  return documents.get(tabId) ?? null;
}

export function updateDocumentContent(tabId: string, content: string): void {
  const entry = documents.get(tabId);
  if (!entry) return;
  entry.content = content;
}

export function setTabCursor(tabId: string, cursor: { line: number; column: number }): void {
  const entry = documents.get(tabId);
  if (!entry) return;
  entry.cursor = normalizePosition(cursor);
}

export function monacoLanguageFor(language: string): string {
  return monacoLanguage(language);
}

export function displayLanguageFor(language: string): string {
  return displayLanguage(language);
}

export function registerEditorApi(api: EditorApi): void {
  editorApi = api;
}

export function getEditorApi(): EditorApi | null {
  return editorApi;
}

function notifyRejected(relPath: string, message: string): void {
  notify(message, 'error', { title: `${baseName(relPath)} can’t be opened` });
}

export async function openFile(
  relPath: string,
  position?: { line: number; column: number },
): Promise<boolean> {
  if (typeof relPath !== 'string' || relPath.trim().length === 0) {
    notify('A file path is required.', 'error');
    return false;
  }

  const requestedPosition = position ? normalizePosition(position) : null;
  const state = appStore.getState();
  const existing = state.tabs.tabs.find((tab) => tab.relPath === relPath);

  if (existing) {
    if (requestedPosition) {
      setTabCursor(existing.id, requestedPosition);
    }
    appStore.dispatch({ type: 'tabs/focus', id: existing.id });
    const entry = documents.get(existing.id);
    if (entry) {
      editorApi?.setPosition(requestedPosition ?? entry.cursor);
    } else if (requestedPosition) {
      editorApi?.setPosition(requestedPosition);
    }
    editorApi?.focus();
    publishStatus(existing.id);
    return true;
  }

  let result;
  try {
    result = await platform.files.read(relPath);
  } catch (error) {
    notifyRejected(relPath, errorMessage(error, `The file ${relPath} could not be read.`));
    return false;
  }

  if (!result.ok) {
    notifyRejected(relPath, result.message);
    return false;
  }

  const id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `tab-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  documents.set(id, {
    content: result.content,
    eol: result.eol,
    language: displayLanguage(result.language),
    cursor: requestedPosition ?? { line: 1, column: 1 },
  });

  appStore.dispatch({
    type: 'tabs/open',
    tab: { id, relPath, name: baseName(relPath) },
  });

  publishStatus(id);

  if (requestedPosition) {
    editorApi?.setPosition(requestedPosition);
  }
  editorApi?.focus();

  return true;
}

export async function saveTab(tabId: string): Promise<boolean> {
  const state = appStore.getState();
  const tab = state.tabs.tabs.find((candidate) => candidate.id === tabId);
  if (!tab) return false;

  const entry = documents.get(tabId);
  if (!entry) return false;

  const content = tabId === state.tabs.activeId && editorApi ? editorApi.getValue() : entry.content;

  let result;
  try {
    result = await platform.files.write(tab.relPath, content, entry.eol);
  } catch (error) {
    notify(errorMessage(error, `The file ${tab.name} could not be saved.`), 'error', {
      title: `${tab.name} can’t be saved`,
    });
    return false;
  }

  if (!result.ok) {
    notify(result.message, 'error', { title: `${tab.name} can’t be saved` });
    return false;
  }

  const latest = tabId === appStore.getState().tabs.activeId && editorApi
    ? editorApi.getValue()
    : entry.content;
  entry.content = latest;
  if (latest === content) {
    appStore.dispatch({ type: 'tabs/dirty', id: tabId, dirty: false });
  }
  return true;
}

export async function saveActive(): Promise<boolean> {
  const activeId = appStore.getState().tabs.activeId;
  return activeId ? saveTab(activeId) : true;
}

export async function saveAll(): Promise<boolean> {
  const state = appStore.getState();
  const dirtyTabs = state.tabs.tabs.filter((tab) => state.tabs.dirty[tab.id]);
  if (dirtyTabs.length === 0) return true;
  const results = await Promise.all(dirtyTabs.map((tab) => saveTab(tab.id)));
  return results.every(Boolean);
}

export function closeTabById(tabId: string): void {
  const state = appStore.getState();
  const tab = state.tabs.tabs.find((candidate) => candidate.id === tabId);
  if (!tab) return;

  appStore.dispatch({ type: 'tabs/close', id: tabId });
  documents.delete(tabId);

  publishStatus(appStore.getState().tabs.activeId);
}

export function closeTabByPath(relPath: string): void {
  const tab = appStore.getState().tabs.tabs.find((candidate) => candidate.relPath === relPath);
  if (!tab) return;
  closeTabById(tab.id);
}

export function setActiveLanguage(languageId: string): void {
  if (typeof languageId !== 'string' || languageId.length === 0) return;
  const activeId = appStore.getState().tabs.activeId;
  if (!activeId) return;

  const entry = documents.get(activeId);
  const display = displayLanguage(languageId);
  if (entry) {
    entry.language = display;
  }
  appStore.dispatch({ type: 'status/update', status: { language: display } });
  editorApi?.setLanguage(monacoLanguage(display));
}

function parseOpenArguments(args: unknown): { relPath: string; position?: { line: number; column: number } } | null {
  if (!args || typeof args !== 'object') return null;
  const value = args as { relPath?: unknown; line?: unknown; column?: unknown };
  if (typeof value.relPath !== 'string' || value.relPath.trim().length === 0) return null;
  const line = typeof value.line === 'number' && Number.isInteger(value.line) && value.line > 0 ? value.line : undefined;
  const column = typeof value.column === 'number' && Number.isInteger(value.column) && value.column > 0 ? value.column : undefined;
  return {
    relPath: value.relPath,
    position: line || column ? { line: line ?? 1, column: column ?? 1 } : undefined,
  };
}

registerCommands([
  {
    id: COMMAND_IDS.openFile,
    title: 'File: Open File',
    run: (args) => {
      const parsed = parseOpenArguments(args);
      if (!parsed) {
        notify('A file path is required.', 'error');
        return false;
      }
      return openFile(parsed.relPath, parsed.position);
    },
  },
  {
    id: COMMAND_IDS.save,
    title: 'File: Save',
    keybinding: COMMAND_KEYBINDINGS[COMMAND_IDS.save],
    run: () => saveActive(),
  },
  {
    id: COMMAND_IDS.saveAll,
    title: 'File: Save All',
    keybinding: COMMAND_KEYBINDINGS[COMMAND_IDS.saveAll],
    run: () => saveAll(),
  },
]);
