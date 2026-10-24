import { useAppStore } from '../state/store';
import { StatusItem } from '../ui/StatusItem';

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

function baseName(absPath: string): string {
  const normalized = absPath.replace(/\\/g, '/').replace(/\/+$/, '');
  return normalized.split('/').pop() ?? absPath;
}

export function StatusBar() {
  const state = useAppStore();
  const status = state.status;
  const root = state.workspace.root;
  const hasDocument = status.relPath !== null;

  if (!hasDocument) {
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

  const indentLabel = `${status.indentMode === 'tabs' ? 'Tabs' : 'Spaces'}: ${status.indentSize}`;

  return (
    <footer className="statusbar" data-od-id="status-bar" data-testid="status-bar">
      <StatusItem>
        <select
          className="status-select"
          aria-label="Language mode"
          value={status.language}
          disabled
          onChange={() => undefined}
        >
          {LANGUAGES.map((language) => (
            <option key={language} value={language}>
              {language}
            </option>
          ))}
        </select>
      </StatusItem>
      <StatusItem>
        <span data-status-position>
          {status.line}:{status.column}
        </span>
      </StatusItem>
      <StatusItem>{indentLabel}</StatusItem>
      <StatusItem>{status.eol.toUpperCase()}</StatusItem>
      <StatusItem>{status.encoding.toUpperCase()}</StatusItem>
      <span className="status-spacer" />
      {root ? <StatusItem>{baseName(root)}</StatusItem> : null}
    </footer>
  );
}
