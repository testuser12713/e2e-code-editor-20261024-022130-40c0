import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import type * as Monaco from 'monaco-editor';
import CssWorkerUrl from 'monaco-editor/language/css/css.worker?worker&url';
import EditorWorkerUrl from 'monaco-editor/editor/editor.worker?worker&url';
import HtmlWorkerUrl from 'monaco-editor/language/html/html.worker?worker&url';
import JsonWorkerUrl from 'monaco-editor/language/json/json.worker?worker&url';
import TsWorkerUrl from 'monaco-editor/language/typescript/ts.worker?worker&url';

type MonacoModule = typeof import('monaco-editor');

type MonacoEnvironment = {
  getWorker(moduleId: string, label: string): Worker;
};

function workerUrlFor(label: string): string {
  switch (label) {
    case 'json':
      return JsonWorkerUrl;
    case 'css':
    case 'scss':
    case 'less':
      return CssWorkerUrl;
    case 'html':
    case 'handlebars':
    case 'razor':
      return HtmlWorkerUrl;
    case 'typescript':
    case 'javascript':
      return TsWorkerUrl;
    default:
      return EditorWorkerUrl;
  }
}

(globalThis as { MonacoEnvironment?: MonacoEnvironment }).MonacoEnvironment = {
  getWorker: (_moduleId, label) => new Worker(workerUrlFor(label), { name: label }),
};

import { COMMAND_IDS, COMMAND_KEYBINDINGS } from '../commands/ids';
import { registerCommands } from '../commands/registry';
import {
  getDocumentEntry,
  monacoLanguageFor,
  registerEditorApi,
  setTabCursor,
  updateDocumentContent,
} from '../state/documents';
import { registerCompletionSource, registerPythonCompletion } from '../python/completion';
import { staticCompletionSource } from '../python/completionStatic';
import { documentCompletionSource } from '../python/documentSymbols';
import { appStore, useAppStore } from '../state/store';
import { Icon } from '../ui/Icon';
import { IconButton } from '../ui/IconButton';
import { WelcomeView } from '../views/WelcomeView';
import { PythonPanel } from './PythonPanel';

type FindMode = 'find' | 'replace';

type FindStateLike = {
  searchString: string;
  replaceString: string;
  matchesCount: number;
  matchesPosition: number;
  change(state: Record<string, unknown>, moveCursor?: boolean): void;
  onFindReplaceStateChange(listener: () => void): { dispose(): void };
};

type FindControllerLike = {
  start(options: Record<string, unknown>, state?: Record<string, unknown>): Promise<void> | void;
  setSearchString(value: string): void;
  moveToNextMatch(): boolean;
  moveToPrevMatch(): boolean;
  replace(): boolean;
  replaceAll(): boolean;
  closeFindWidget(): void;
  getState(): FindStateLike;
};

type FindInfo = { current: number; total: number };

const FONT_FAMILY = '"JetBrains Mono", ui-monospace, "Cascadia Mono", Consolas, "Liberation Mono", monospace';

const EDITOR_STYLE = `
.forge-monaco { position: absolute; inset: 0; }
.forge-monaco .monaco-editor .find-widget { display: none !important; }
.forge-monaco .monaco-editor .scroll-decoration { box-shadow: none; }
.find-arrow-up { transform: rotate(180deg); }
`;

const THEME_RULES = [
  { token: 'keyword', foreground: 'e89a8a' },
  { token: 'string', foreground: '8ed49b' },
  { token: 'number', foreground: 'e4c47a' },
  { token: 'comment', foreground: '7d8188', fontStyle: 'italic' },
  { token: 'type', foreground: 'c3a9e8' },
  { token: 'type.identifier', foreground: 'c3a9e8' },
  { token: 'function', foreground: '7cb8e8' },
  { token: 'identifier', foreground: 'd9dce0' },
  { token: 'variable', foreground: 'd9dce0' },
  { token: 'tag', foreground: 'e89a8a' },
  { token: 'attribute.name', foreground: '9dc3e0' },
  { token: 'attribute.value', foreground: '8ed49b' },
  { token: 'delimiter', foreground: '9aa0a8' },
];

const THEME_RULES_LIGHT = [
  { token: 'keyword', foreground: 'a63a2a' },
  { token: 'string', foreground: '216b41' },
  { token: 'number', foreground: '8a5a13' },
  { token: 'comment', foreground: '83878d', fontStyle: 'italic' },
  { token: 'type', foreground: '6a3b9c' },
  { token: 'type.identifier', foreground: '6a3b9c' },
  { token: 'function', foreground: '2466a8' },
  { token: 'identifier', foreground: '383c42' },
  { token: 'variable', foreground: '383c42' },
  { token: 'tag', foreground: 'a63a2a' },
  { token: 'attribute.name', foreground: '2e5f86' },
  { token: 'attribute.value', foreground: '216b41' },
  { token: 'delimiter', foreground: '5f646b' },
];

function defineThemes(monaco: MonacoModule): void {
  monaco.editor.defineTheme('forge-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: THEME_RULES,
    colors: {
      'editor.background': '#20242a',
      'editor.foreground': '#d9dce0',
      'editorLineNumber.foreground': '#666b73',
      'editorLineNumber.activeForeground': '#c9ccd1',
      'editor.lineHighlightBackground': '#282d34',
      'editor.selectionBackground': '#574934',
      'editor.inactiveSelectionBackground': '#3a342b',
      'editorCursor.foreground': '#e6b36b',
      'editor.findMatchBackground': '#6b552f',
      'editor.findMatchHighlightBackground': '#3d3527',
      'editorWidget.background': '#2a2f35',
      'editorWidget.border': '#4a5058',
    },
  });
  monaco.editor.defineTheme('forge-light', {
    base: 'vs',
    inherit: true,
    rules: THEME_RULES_LIGHT,
    colors: {
      'editor.background': '#fcfdfd',
      'editor.foreground': '#383c42',
      'editorLineNumber.foreground': '#9a9ea4',
      'editorLineNumber.activeForeground': '#4a4f56',
      'editor.lineHighlightBackground': '#f1f3f4',
      'editor.selectionBackground': '#f0dcc0',
      'editor.inactiveSelectionBackground': '#f6ecdc',
      'editorCursor.foreground': '#b8752a',
      'editor.findMatchBackground': '#f3d7a8',
      'editor.findMatchHighlightBackground': '#f7e7c9',
      'editorWidget.background': '#ffffff',
      'editorWidget.border': '#c9cdd2',
    },
  });
}

let findLauncher: ((mode: FindMode) => void) | null = null;

function launchFind(mode: FindMode): boolean {
  if (!findLauncher) return false;
  findLauncher(mode);
  return true;
}

registerCommands([
  {
    id: COMMAND_IDS.find,
    title: 'Edit: Find',
    keybinding: COMMAND_KEYBINDINGS[COMMAND_IDS.find],
    run: () => launchFind('find'),
  },
  {
    id: COMMAND_IDS.replace,
    title: 'Edit: Replace',
    keybinding: COMMAND_KEYBINDINGS[COMMAND_IDS.replace],
    run: () => launchFind('replace'),
  },
]);

function countsFor(state: FindStateLike): FindInfo {
  return {
    current: state.matchesPosition,
    total: state.matchesCount,
  };
}

type FindWidgetProps = {
  mode: FindMode;
  controller: FindControllerLike;
  focusToken: number;
  onClose: () => void;
};

function FindWidget({ mode, controller, focusToken, onClose }: FindWidgetProps) {
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [info, setInfo] = useState<FindInfo>({ current: 0, total: 0 });
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const state = controller.getState();
    setQuery(state.searchString);
    setReplacement(state.replaceString);
    setInfo(countsFor(state));
    const subscription = state.onFindReplaceStateChange(() => {
      setInfo(countsFor(state));
      setQuery(state.searchString);
      setReplacement(state.replaceString);
    });
    return () => subscription.dispose();
  }, [controller]);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [focusToken, mode]);

  const updateQuery = (value: string) => {
    setQuery(value);
    controller.setSearchString(value);
    setInfo(countsFor(controller.getState()));
  };

  const updateReplacement = (value: string) => {
    setReplacement(value);
    controller.getState().change({ replaceString: value }, false);
  };

  const step = (direction: number) => {
    if (direction > 0) {
      controller.moveToNextMatch();
    } else {
      controller.moveToPrevMatch();
    }
    setInfo(countsFor(controller.getState()));
  };

  const replaceCurrent = () => {
    controller.replace();
    setInfo(countsFor(controller.getState()));
  };

  const replaceAll = () => {
    controller.replaceAll();
    setInfo(countsFor(controller.getState()));
  };

  const close = () => {
    controller.closeFindWidget();
    onClose();
  };

  const currentMatch = info.total > 0 ? Math.max(info.current, 1) : 0;
  const countLabel = `${currentMatch} of ${info.total}`;

  return (
    <div
      className="find-widget"
      role="search"
      aria-label="Find and replace"
      data-testid="find-widget"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          close();
        } else if (event.key === 'Enter' && event.target === inputRef.current) {
          event.preventDefault();
          step(event.shiftKey ? -1 : 1);
        }
      }}
    >
      <div className="find-row">
        <input
          ref={inputRef}
          className="find-input"
          type="text"
          value={query}
          aria-label="Find in file"
          data-testid="find-input"
          data-find-input
          onChange={(event) => updateQuery(event.target.value)}
        />
        <span className="find-count" aria-live="polite" data-testid="find-count" data-find-count>
          {countLabel}
        </span>
        <div className="find-actions">
          <IconButton
            label="Previous match"
            size="sm"
            disabled={info.total === 0}
            data-find-step="-1"
            onClick={() => step(-1)}
          >
            <Icon name="chevron-down" size="sm" className="find-arrow-up" />
          </IconButton>
          <IconButton
            label="Next match"
            size="sm"
            disabled={info.total === 0}
            data-find-step="1"
            onClick={() => step(1)}
          >
            <Icon name="chevron-down" size="sm" />
          </IconButton>
          <IconButton label="Close find" size="sm" onClick={close}>
            <Icon name="close" size="sm" />
          </IconButton>
        </div>
      </div>
      {mode === 'replace' ? (
        <div className="find-row">
          <input
            className="find-input"
            type="text"
            value={replacement}
            aria-label="Replace with"
            data-testid="replace-input"
            data-find-replacement
            onChange={(event) => updateReplacement(event.target.value)}
          />
          <div className="find-actions">
            <button
              className="find-btn"
              type="button"
              disabled={info.total === 0}
              data-find-replace
              onClick={replaceCurrent}
            >
              Replace
            </button>
            <button
              className="find-btn find-btn-primary"
              type="button"
              disabled={info.total === 0}
              data-find-replace-all
              onClick={replaceAll}
            >
              Replace All
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function EditorPane() {
  const state = useAppStore();
  const root = state.workspace.root;
  const activeId = state.tabs.activeId;
  const settings = state.settings;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<MonacoModule | null>(null);
  const modelRef = useRef<Monaco.editor.ITextModel | null>(null);
  const controllerRef = useRef<FindControllerLike | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const settingsRef = useRef(settings);
  const suppressRef = useRef(false);

  const [ready, setReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [findMode, setFindMode] = useState<FindMode | null>(null);
  const [findFocusToken, setFindFocusToken] = useState(0);

  settingsRef.current = settings;

  const openFindWidget = (mode: FindMode) => {
    setFindMode(mode);
    setFindFocusToken((token) => token + 1);
  };

  useEffect(() => {
    findLauncher = (mode) => {
      if (!activeIdRef.current || !controllerRef.current) return;
      openFindWidget(mode);
    };
    return () => {
      findLauncher = null;
    };
  }, []);

  useEffect(() => {
    if (root === null) return undefined;

    let cancelled = false;
    let editor: Monaco.editor.IStandaloneCodeEditor | null = null;
    let model: Monaco.editor.ITextModel | null = null;
    const subscriptions: { dispose(): void }[] = [];

    void import('monaco-editor')
      .then((monaco) => {
        if (cancelled || !containerRef.current) return;

        defineThemes(monaco);
        registerCompletionSource(staticCompletionSource);
        registerCompletionSource(documentCompletionSource);
        subscriptions.push(registerPythonCompletion(monaco));
        const current = settingsRef.current;
        model = monaco.editor.createModel('', 'plaintext');
        editor = monaco.editor.create(containerRef.current, {
          model,
          theme: current.theme === 'dark' ? 'forge-dark' : 'forge-light',
          fontSize: current.fontSize,
          fontFamily: FONT_FAMILY,
          tabSize: current.tabSize,
          insertSpaces: true,
          wordWrap: current.wordWrap ? 'on' : 'off',
          renderWhitespace: current.renderWhitespace ? 'all' : 'none',
          minimap: { enabled: false },
          automaticLayout: true,
          scrollBeyondLastLine: false,
          smoothScrolling: false,
          lineNumbersMinChars: 3,
          padding: { top: 8, bottom: 28 },
          renderLineHighlight: 'all',
          fixedOverflowWidgets: true,
        });

        monacoRef.current = monaco;
        editorRef.current = editor;
        modelRef.current = model;
        controllerRef.current = editor.getContribution(
          'editor.contrib.findController',
        ) as unknown as FindControllerLike;

        subscriptions.push(
          editor.onDidChangeModelContent(() => {
            const id = activeIdRef.current;
            if (!id || suppressRef.current) return;
            updateDocumentContent(id, editor?.getValue() ?? '');
            appStore.dispatch({ type: 'tabs/dirty', id, dirty: true });
          }),
        );

        subscriptions.push(
          editor.onDidChangeCursorPosition((event) => {
            const id = activeIdRef.current;
            if (!id || suppressRef.current) return;
            const cursor = { line: event.position.lineNumber, column: event.position.column };
            setTabCursor(id, cursor);
            appStore.dispatch({ type: 'status/update', status: cursor });
          }),
        );

        registerEditorApi({
          getValue: () => editorRef.current?.getValue() ?? '',
          getPosition: () => {
            const position = editorRef.current?.getPosition();
            return { line: position?.lineNumber ?? 1, column: position?.column ?? 1 };
          },
          setPosition: (position) => {
            const target = editorRef.current;
            if (!target) return;
            const monacoPosition = { lineNumber: position.line, column: position.column };
            target.setPosition(monacoPosition);
            target.revealPositionInCenterIfOutsideViewport(monacoPosition);
          },
          focus: () => {
            editorRef.current?.focus();
          },
          setLanguage: (languageId) => {
            const currentModel = modelRef.current;
            const instance = monacoRef.current;
            if (!currentModel || !instance) return;
            instance.editor.setModelLanguage(
              currentModel,
              monacoLanguageFor(languageId),
            );
          },
        });

        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });

    return () => {
      cancelled = true;
      for (const subscription of subscriptions) subscription.dispose();
      editorRef.current = null;
      modelRef.current = null;
      monacoRef.current = null;
      controllerRef.current = null;
      activeIdRef.current = null;
      editor?.dispose();
      model?.dispose();
      setReady(false);
    };
  }, [root]);

  useEffect(() => {
    const editor = editorRef.current;
    const model = modelRef.current;
    const monaco = monacoRef.current;
    if (!ready || !editor || !model || !monaco) return;

    const previous = activeIdRef.current;
    if (previous && previous !== activeId) {
      updateDocumentContent(previous, editor.getValue());
      const position = editor.getPosition();
      if (position) {
        setTabCursor(previous, { line: position.lineNumber, column: position.column });
      }
    }

    const tab = state.tabs.tabs.find((candidate) => candidate.id === activeId) ?? null;
    const entry = tab ? getDocumentEntry(tab.id) : null;
    const cursor = entry ? entry.cursor : { line: 1, column: 1 };
    const monacoCursor = { lineNumber: cursor.line, column: cursor.column };

    suppressRef.current = true;
    model.setValue(entry ? entry.content : '');
    monaco.editor.setModelLanguage(model, entry ? monacoLanguageFor(entry.language) : 'plaintext');
    editor.setPosition(monacoCursor);
    editor.revealPositionInCenterIfOutsideViewport(monacoCursor);
    suppressRef.current = false;
    activeIdRef.current = tab ? tab.id : null;

    if (tab) {
      const live = appStore.getState();
      appStore.dispatch({
        type: 'status/update',
        status: {
          relPath: tab.relPath,
          language: entry ? entry.language : 'Plain Text',
          line: cursor.line,
          column: cursor.column,
          indentMode: 'spaces',
          indentSize: live.settings.tabSize,
          eol: entry ? entry.eol : 'lf',
          encoding: 'utf-8',
        },
      });
    } else {
      appStore.dispatch({ type: 'status/reset' });
    }
  }, [activeId, ready, root, state.tabs.tabs]);

  useEffect(() => {
    const editor = editorRef.current;
    const model = modelRef.current;
    const monaco = monacoRef.current;
    if (!ready || !editor || !model || !monaco) return;

    monaco.editor.setTheme(settings.theme === 'dark' ? 'forge-dark' : 'forge-light');
    editor.updateOptions({
      fontSize: settings.fontSize,
      tabSize: settings.tabSize,
      wordWrap: settings.wordWrap ? 'on' : 'off',
      renderWhitespace: settings.renderWhitespace ? 'all' : 'none',
    });
    model.updateOptions({ tabSize: settings.tabSize, insertSpaces: true });

    if (activeIdRef.current) {
      appStore.dispatch({
        type: 'status/update',
        status: { indentMode: 'spaces', indentSize: settings.tabSize },
      });
    }
  }, [settings, ready]);

  useEffect(() => {
    const controller = controllerRef.current;
    if (!findMode || !controller || !activeIdRef.current) return;

    void Promise.resolve(
      controller.start(
        {
          forceRevealReplace: findMode === 'replace',
          seedSearchStringFromSelection: 'none',
          seedSearchStringFromNonEmptySelection: false,
          seedSearchStringFromGlobalClipboard: false,
          shouldFocus: 0,
          shouldAnimate: false,
          updateSearchScope: false,
          loop: true,
        },
        {
          searchString: controller.getState().searchString,
          replaceString: controller.getState().replaceString,
          isReplaceRevealed: findMode === 'replace',
        },
      ),
    ).then(() => {
      setFindFocusToken((token) => token + 1);
    });
  }, [findMode, ready]);

  const handleKeyDownCapture = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && findMode) {
      event.preventDefault();
      event.stopPropagation();
      controllerRef.current?.closeFindWidget();
      setFindMode(null);
      return;
    }

    if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return;
    if (!activeIdRef.current) return;

    const key = event.key.toLowerCase();
    if (key === 'f') {
      event.preventDefault();
      event.stopPropagation();
      openFindWidget('find');
    } else if (key === 'h') {
      event.preventDefault();
      event.stopPropagation();
      openFindWidget('replace');
    }
  };

  if (root === null) {
    return <WelcomeView />;
  }

  const hasTab = activeId !== null;

  return (
    <>
      <div
        className="editor-stage"
        data-od-id="monaco-editor"
        data-testid="editor-stage"
        onKeyDownCapture={handleKeyDownCapture}
      >
        <style>{EDITOR_STYLE}</style>
        <div
          ref={containerRef}
          className="forge-monaco"
          style={{ display: hasTab ? 'block' : 'none' }}
          data-testid="monaco-mount"
        />
        {!hasTab ? (
          <div className="editor-empty">
            <div>
              <h2>No file open</h2>
              <p>Select a file from the explorer to open it in the editor.</p>
            </div>
          </div>
        ) : null}
        {loadFailed ? (
          <div className="editor-empty" role="alert">
            <div>
              <h2>Editor unavailable</h2>
              <p>The editor bundle could not be loaded. Restart Forge and try again.</p>
            </div>
          </div>
        ) : null}
        {findMode && controllerRef.current ? (
          <FindWidget
            mode={findMode}
            controller={controllerRef.current}
            focusToken={findFocusToken}
            onClose={() => setFindMode(null)}
          />
        ) : null}
      </div>
      <PythonPanel />
    </>
  );
}
