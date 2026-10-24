import { Menu, type MenuEntry } from '../ui/Menu';
import { StatusItem } from '../ui/StatusItem';
import { appStore, useAppStore } from '../state/store';
import { setActiveLanguage } from '../state/documents';

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

const INDENT_OPTIONS: { label: string; mode: 'spaces' | 'tabs'; size: 2 | 4 | 8 }[] = [
  { label: 'Spaces: 2', mode: 'spaces', size: 2 },
  { label: 'Spaces: 4', mode: 'spaces', size: 4 },
  { label: 'Spaces: 8', mode: 'spaces', size: 8 },
  { label: 'Tabs', mode: 'tabs', size: 2 },
];

const STATUS_MENU_STYLE = `
.statusbar .status-menu {
  position: relative;
  display: inline-flex;
  align-items: center;
  min-height: 100%;
}
.statusbar .status-menu .menu {
  top: auto;
  bottom: calc(100% + 6px);
  left: 0;
}
.statusbar .status-menu .menu-trigger {
  height: 100%;
  min-height: 100%;
  padding: 0 15px 0 0;
  border-radius: 0;
  background-color: transparent;
  background-image: linear-gradient(45deg, transparent 50%, var(--muted) 50%),
    linear-gradient(135deg, var(--muted) 50%, transparent 50%);
  background-position: right 6px center, right 3px center;
  background-size: 3px 3px, 3px 3px;
  background-repeat: no-repeat;
  color: var(--muted);
  font: inherit;
  line-height: 1;
  cursor: pointer;
}
.statusbar .status-menu .menu-trigger:hover,
.statusbar .status-menu .menu-trigger[aria-expanded='true'] {
  background-color: transparent;
  color: var(--fg);
}
.statusbar {
  overflow: visible;
}
`;

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

  if (!hasDocument) {
    return (
      <footer className="statusbar" data-od-id="status-bar" data-testid="status-bar">
        <style>{STATUS_MENU_STYLE}</style>
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
      <style>{STATUS_MENU_STYLE}</style>
      <StatusItem>
        <span className="status-menu" data-testid="status-language-control">
          <Menu
            label={status.language}
            testId="status-language"
            menuTestId="status-language-menu"
            items={languageItems((language) => setActiveLanguage(language))}
          />
        </span>
      </StatusItem>
      <StatusItem>
        <span data-status-position>
          {status.line}:{status.column}
        </span>
      </StatusItem>
      <StatusItem>
        <span className="status-menu" data-testid="status-indentation-control">
          <Menu
            label={indentLabel}
            testId="status-indentation"
            menuTestId="status-indentation-menu"
            items={indentItems(selectIndent)}
          />
        </span>
      </StatusItem>
      <StatusItem>{status.eol.toUpperCase()}</StatusItem>
      <StatusItem>{status.encoding.toUpperCase()}</StatusItem>
      <span className="status-spacer" />
      {root ? <StatusItem>{baseName(root)}</StatusItem> : null}
    </footer>
  );
}
