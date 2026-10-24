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

export type PlatformApi = {
  workspace: CapabilityApi;
  files: FilesApi;
  manage: ManageApi;
  quickOpen: QuickOpenApi;
  search: SearchApi;
  persist: PersistApi;
  app: AppApi;
  menu: MenuApi;
};
