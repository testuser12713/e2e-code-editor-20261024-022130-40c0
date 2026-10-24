export type TreeNode = {
  name: string;
  relPath: string;
  kind: 'file' | 'dir';
};

export type OpResult = { ok: true } | { ok: false; message: string };

export type ReadFileResult =
  | {
      ok: true;
      content: string;
      eol: 'lf' | 'crlf';
      encoding: 'utf-8';
      language: string;
    }
  | {
      ok: false;
      reason: 'too-large' | 'binary' | 'not-found' | 'outside-workspace' | 'io';
      message: string;
    };

export type SearchQuery = {
  text: string;
  caseSensitive: boolean;
  wholeWord: boolean;
  regex: boolean;
};

export type SearchHit = {
  relPath: string;
  line: number;
  column: number;
  lineText: string;
  matchLength: number;
};

export type SearchResultGroup = {
  relPath: string;
  hits: SearchHit[];
};

export type Settings = {
  theme: 'dark' | 'light';
  fontSize: number;
  tabSize: 2 | 4 | 8;
  wordWrap: boolean;
  renderWhitespace: boolean;
  treeFontSize: number;
};

export type SessionState = {
  workspaceRoot: string | null;
  tabs: { relPath: string; cursor: { line: number; column: number } }[];
  activeRelPath: string | null;
};

export type MenuState = {
  hasWorkspace: boolean;
  hasDocument: boolean;
  canSave: boolean;
  hasDirtyTabs: boolean;
};

export type Tab = {
  id: string;
  relPath: string;
  name: string;
};

export type DocumentStatus = {
  relPath: string | null;
  language: string;
  line: number;
  column: number;
  indentMode: 'spaces' | 'tabs';
  indentSize: 2 | 4 | 8;
  eol: 'lf' | 'crlf';
  encoding: 'utf-8';
};

export type SidebarView = 'explorer' | 'search' | 'settings';

export type TabsState = {
  tabs: Tab[];
  activeId: string | null;
  dirty: Record<string, boolean>;
};

export type WorkspaceState = {
  root: string | null;
  listings: Record<string, TreeNode[]>;
  expanded: Record<string, boolean>;
};

export type AppState = {
  settings: Settings;
  workspace: WorkspaceState;
  tabs: TabsState;
  status: DocumentStatus;
  sidebarView: SidebarView;
};

export type EditorApi = {
  getValue(): string;
  getPosition(): { line: number; column: number };
  setPosition(position: { line: number; column: number }): void;
  focus(): void;
  setLanguage(languageId: string): void;
};

export type CapabilityApi = {
  openDialog(): Promise<string | null>;
  openFolder(absPath: string): Promise<OpResult>;
  getRoot(): Promise<string | null>;
  listDir(relPath: string): Promise<TreeNode[]>;
};

export type FilesApi = {
  read(relPath: string): Promise<ReadFileResult>;
  write(relPath: string, content: string, eol: 'lf' | 'crlf'): Promise<OpResult>;
};

export type ManageApi = {
  create(relPath: string, kind: 'file' | 'dir'): Promise<OpResult>;
  rename(fromRel: string, toRel: string): Promise<OpResult>;
  remove(relPath: string): Promise<OpResult>;
};

export type QuickOpenApi = {
  listFiles(): Promise<string[]>;
};

export type SearchApi = {
  run(query: SearchQuery, searchId: string): Promise<SearchResultGroup[]>;
  cancel(searchId: string): Promise<void>;
};

export type PersistApi = {
  loadSettings(): Promise<Settings | null>;
  saveSettings(settings: Settings): Promise<OpResult>;
  loadSession(): Promise<SessionState | null>;
  saveSession(session: SessionState): Promise<OpResult>;
  loadRecentFolders(): Promise<string[]>;
  addRecentFolder(absPath: string): Promise<void>;
  clearLocalData(): Promise<OpResult>;
  userDataPath(): Promise<string>;
};

export type AppApi = {
  openExternal(url: string): Promise<void>;
  onBeforeClose(callback: () => void): () => void;
  confirmClose(): void;
};

export type MenuApi = {
  setMenuState(state: MenuState): void;
  onCommand(callback: (commandId: string) => void): () => void;
};

export type PythonStartResult =
  | { ok: true; runId: string }
  | { ok: false; message: string };

export type PythonCheckResult =
  | { ok: true; lineCount: number }
  | {
      ok: false;
      kind: 'syntax';
      line: number;
      column: number;
      sourceText: string;
      message: string;
    }
  | { ok: false; kind: 'rejected'; message: string }
  | { ok: false; kind: 'interpreter-missing' };

export type PythonInterpreter =
  | { found: true; path: string; version: string }
  | { found: false };

export type PythonLocation = {
  relPath: string;
  line: number;
  column: number | null;
};

export type PythonEvent =
  | { kind: 'started'; runId: string; interpreter: PythonInterpreter }
  | {
      kind: 'output';
      runId: string;
      stream: 'stdout' | 'stderr';
      text: string;
      loc: PythonLocation | null;
    }
  | {
      kind: 'notice';
      runId: string;
      notice: 'stdin-eof' | 'interpreter-missing';
    }
  | {
      kind: 'exit';
      runId: string;
      reason: 'exit' | 'stopped' | 'timeout';
      code: number | null;
      durationMs: number;
    };

export type PythonApi = {
  run(relPath: string): Promise<PythonStartResult>;
  stop(runId: string): Promise<OpResult>;
  check(relPath: string): Promise<PythonCheckResult>;
  interpreter(): Promise<PythonInterpreter>;
  onEvent(callback: (event: PythonEvent) => void): () => void;
};

export type PlatformApi = {
  workspace: CapabilityApi;
  files: FilesApi;
  manage: ManageApi;
  quickOpen: QuickOpenApi;
  search: SearchApi;
  persist: PersistApi;
  app: AppApi;
  menu: MenuApi;
  python: PythonApi;
};
