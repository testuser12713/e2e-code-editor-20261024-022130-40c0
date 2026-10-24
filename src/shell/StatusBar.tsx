import { Menu, type MenuEntry } from '../ui/Menu';
import { StatusItem } from '../ui/StatusItem';
import { appStore, useAppStore } from '../state/store';
import { setActiveLanguage } from '../state/documents';
import './statusbar.css';

const LANGUAGES = [
  'TypeScript',
  'JavaScript',
  'JSON',
  'HTML',
  'CSS',
  'SCSS',
  'Python',
  'Markdown',
  'Shell',
  'YAML',
  'XML',
  'Plain Text',
];

const PLACEHOLDER = '\u2014';
const POSITION_PLACEHOLDER = `${PLACEHOLDER}:${PLACEHOLDER}`;

const INDENT_OPTIONS: { label: string; mode: 'spaces' | 'tabs'; size: 2 | 4 | 8 }[] = [
  { label: 'Spaces: 2', mode: 'spaces', size: 2 },
  { label: 'Spaces: 4', mode: 'spaces', size: 4 },
  { label: 'Spaces: 8', mode: 'spaces', size: 8 },
  { label: 'Tabs', mode: 'tabs', size: 2 },
];

function baseName(absPath: string): string {
  const normalized = absPath.replace(/\\/g, '/').replace(/\/+$/, '');
  return normalized.split('/').pop() ?? absPath;
}

function languageItems(onSelect: (language: string) => void): MenuEntry[] {
  return LANGUAGES.map((language) => ({
    label: language,
    onSelect: () => onSelect(language),
    testId: `status-language-option-${language.toLowerCase().replace(/\s+/g, '-')}`,
  }));
}

function indentItems(
  onSelect: (option: (typeof INDENT_OPTIONS)[number]) => void,
): MenuEntry[] {
  return INDENT_OPTIONS.map((option) => ({
    label: option.label,
    onSelect: () => onSelect(option),
    testId: `status-indent-option-${option.mode}-${option.size}`,
  }));
}

export function StatusBar() {
  const state = useAppStore();
  const status = state.status;
  const root = state.workspace.root;
  const hasDocument = status.relPath !== null;
  const indentLabel = status.indentMode === 'tabs' ? 'Tabs' : `Spaces: ${status.indentSize}`;

  if (!root && !hasDocument) {
    return (
      <footer className="statusbar" data-od-id="status-bar" data-testid="status-bar">
        <StatusItem>
          <span className="accent-dot" />
          <strong>Welcome</strong>
        </StatusItem>
        <StatusItem>No active document</StatusItem>
        <span className="status-spacer" />
        <StatusItem>Local session</StatusItem>
        <StatusItem>UTF-8</StatusItem>
      </footer>
    );
  }

  if (root && !hasDocument) {
    return (
      <footer className="statusbar" data-od-id="status-bar" data-testid="status-bar">
        <StatusItem title="Language">
          <span className="status-placeholder" data-status-language data-testid="status-language">
            {PLACEHOLDER}
          </span>
        </StatusItem>
        <StatusItem title="Line and column">
          <span
            className="status-placeholder"
            data-status-position
            data-testid="status-position"
          >
            {POSITION_PLACEHOLDER}
          </span>
        </StatusItem>
        <StatusItem title="Indentation">
          <span
            className="status-placeholder"
            data-status-indentation
            data-testid="status-indentation"
          >
            {PLACEHOLDER}
          </span>
        </StatusItem>
        <StatusItem title="Line ending">
          <span className="status-placeholder" data-status-eol data-testid="status-eol">
            {PLACEHOLDER}
          </span>
        </StatusItem>
        <StatusItem title="Encoding">
          <span className="status-placeholder" data-status-encoding data-testid="status-encoding">
            {PLACEHOLDER}
          </span>
        </StatusItem>
        <span className="status-spacer" />
        <StatusItem title={root}>{baseName(root)}</StatusItem>
      </footer>
    );
  }

  const selectIndent = (option: (typeof INDENT_OPTIONS)[number]) => {
    if (option.mode === 'tabs') {
      appStore.dispatch({
        type: 'status/update',
        status: { indentMode: 'tabs' },
      });
      return;
    }
    appStore.dispatch({ type: 'settings/update', patch: { tabSize: option.size } });
    appStore.dispatch({
      type: 'status/update',
      status: { indentMode: 'spaces', indentSize: option.size },
    });
  };

  return (
    <footer className="statusbar" data-od-id="status-bar" data-testid="status-bar">
      <StatusItem>
        <span className="status-menu" data-status-language data-testid="status-language-control">
          <Menu
            label={status.language}
            testId="status-language"
            menuTestId="status-language-menu"
            items={languageItems((language) => setActiveLanguage(language))}
          />
        </span>
      </StatusItem>
      <StatusItem title="Line and column">
        <span data-status-position data-testid="status-position">
          {status.line}:{status.column}
        </span>
      </StatusItem>
      <StatusItem>
        <span
          className="status-menu"
          data-status-indentation
          data-testid="status-indentation-control"
        >
          <Menu
            label={indentLabel}
            testId="status-indentation"
            menuTestId="status-indentation-menu"
            items={indentItems(selectIndent)}
          />
        </span>
      </StatusItem>
      <StatusItem title="Line ending">
        <span data-status-eol data-testid="status-eol">
          {status.eol.toUpperCase()}
        </span>
      </StatusItem>
      <StatusItem title="Encoding">
        <span data-status-encoding data-testid="status-encoding">
          {status.encoding.toUpperCase()}
        </span>
      </StatusItem>
      <span className="status-spacer" />
      {root ? <StatusItem title={root}>{baseName(root)}</StatusItem> : null}
    </footer>
  );
}
