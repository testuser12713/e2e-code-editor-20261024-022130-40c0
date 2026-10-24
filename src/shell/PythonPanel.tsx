import { cn } from '../lib/cn';
import { hasDesktopBridge } from '../platform';
import {
  checkActivePython,
  isPythonCheckSuccess,
  pythonCheckOutcome,
  type PythonCheckOutcome,
} from '../python/checkPython';
import {
  clearPythonOutput,
  usePythonSession,
  type PythonOutputLine,
  type PythonRun,
} from '../python/pythonSession';
import { runActivePython, stopPythonRun } from '../python/runPython';
import { openFile } from '../state/documents';
import { useAppStore } from '../state/store';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import './pythonpanel.css';

type PanelGlyphName = 'terminal' | 'play' | 'check' | 'clear' | 'stop';

function PanelGlyph({ name }: { name: PanelGlyphName }) {
  return (
    <svg className="icon icon-sm" aria-hidden="true" focusable="false">
      {name === 'terminal' ? (
        <>
          <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
          <path d="m7 9 3 3-3 3M12.5 15h4.5" />
        </>
      ) : null}
      {name === 'play' ? <path d="M8.5 5.5 19 12 8.5 18.5z" /> : null}
      {name === 'check' ? <path d="m5 12.5 4.5 4.5L19 7" /> : null}
      {name === 'clear' ? <path d="M5 7h14M9 7V4.5h6V7M7 7l1 13h8l1-13" /> : null}
      {name === 'stop' ? <rect x="7" y="7" width="10" height="10" rx="1.5" /> : null}
    </svg>
  );
}

function isPythonFile(relPath: string | null): boolean {
  return typeof relPath === 'string' && /\.py$/i.test(relPath);
}

function baseName(relPath: string): string {
  const normalized = relPath.replace(/\\/g, '/');
  return normalized.split('/').pop() || normalized;
}

function isSummaryLine(line: PythonOutputLine): boolean {
  return line.text.startsWith('Process exited') || line.text.startsWith('Process stopped');
}

function hasBlankGutter(line: PythonOutputLine): boolean {
  return (
    line.text.startsWith('Process stopped') ||
    line.text.startsWith('No process was started') ||
    line.text.startsWith('No syntax errors found before line') ||
    line.text.startsWith('The output panel is shown')
  );
}

function displayStream(line: PythonOutputLine): string {
  if (line.stream === 'meta' && isPythonCheckSuccess(line.text)) return 'success';
  if (line.stream === 'meta' && /^Process exited with code 0\b/.test(line.text)) return 'success';
  return line.stream;
}

function badgeFor(
  run: PythonRun,
  interpreterFound: boolean | null,
  desktop: boolean,
  activeIsPython: boolean,
  checkOutcome: PythonCheckOutcome,
): { label: string; className: string } {
  if (!desktop) return { label: 'unavailable', className: 'badge' };
  if (interpreterFound === false) return { label: 'no interpreter', className: 'badge badge-danger' };

  if (run.state === 'running') return { label: 'running', className: 'badge badge-info badge-dot' };
  if (checkOutcome === 'passed') return { label: 'check passed', className: 'badge badge-success' };
  if (checkOutcome === 'syntax-error') {
    return { label: 'syntax error', className: 'badge badge-danger' };
  }
  if (run.state === 'finished') {
    if (run.reason === 'stopped') return { label: 'stopped', className: 'badge badge-warn' };
    if (run.reason === 'timeout') return { label: 'timeout', className: 'badge badge-warn' };
    if (run.code === 0) return { label: 'exit 0', className: 'badge badge-success' };
    return { label: `exit ${run.code ?? '?'}`, className: 'badge badge-danger' };
  }

  if (!activeIsPython) return { label: 'unavailable', className: 'badge' };
  return { label: 'idle', className: 'badge' };
}

export function PythonPanel() {
  const app = useAppStore();
  const { lines, run, interpreter } = usePythonSession();
  const activeId = app.tabs.activeId;
  const activeTab = activeId
    ? app.tabs.tabs.find((candidate) => candidate.id === activeId) ?? null
    : null;
  const activeRelPath = activeTab?.relPath ?? null;
  const activeIsPython = isPythonFile(activeRelPath);
  const desktop = hasDesktopBridge;
  const checkOutcome = pythonCheckOutcome(lines, activeRelPath ?? undefined);
  const running = run.state === 'running';

  const displayRelPath = run.state === 'idle' ? activeRelPath : run.relPath;
  const fileName = displayRelPath ? baseName(displayRelPath) : 'No file open';
  const interpreterFound = interpreter === null ? null : interpreter.found;
  const badge = badgeFor(run, interpreterFound, desktop, activeIsPython, checkOutcome);

  let interpreterLabel = 'Python';
  if (!desktop) {
    interpreterLabel = 'Desktop feature';
  } else if (interpreter?.found) {
    interpreterLabel = `Python ${interpreter.version}`;
  } else if (interpreter?.found === false) {
    interpreterLabel = 'Interpreter not found';
  } else if (activeTab && !activeIsPython) {
    interpreterLabel = 'Python unavailable for this tab';
  }

  const actionsUnavailable = !desktop || !activeIsPython;

  const runDisabled = actionsUnavailable || running;
  const runTitle = !activeIsPython
    ? 'Only Python files can be run'
    : !desktop
      ? 'Running Python requires the desktop application.'
      : running
        ? 'A Python process is already running'
        : 'Save the open file and run it';

  const checkDisabled = actionsUnavailable;
  const checkTitle = !activeIsPython
    ? 'Only Python files can be run'
    : !desktop
      ? 'Running Python requires the desktop application.'
      : 'Compile the open file without running it';

  const showEmptyState = desktop && activeIsPython && !running && lines.length === 0;
  const showNonPythonNote = activeTab !== null && !activeIsPython;

  return (
    <section
      className="python-panel"
      aria-label="Python output"
      data-od-id="python-output-panel"
      data-testid="python-panel"
      data-python-panel
      data-python-actions={actionsUnavailable ? 'unavailable' : 'available'}
      data-python-build={desktop ? 'desktop' : 'browser'}
    >
      <header className="python-head">
        <div className="python-id">
          <span className="python-file">
            <PanelGlyph name="terminal" />
            <span data-python-file-name>{fileName}</span>
          </span>
          <span className="python-interpreter" data-python-interpreter>
            {interpreterLabel}
          </span>
          <span className={badge.className} data-python-state>
            {badge.label}
          </span>
        </div>
        <div className="python-actions">
          <Button
            variant="primary"
            size="sm"
            type="button"
            disabled={runDisabled}
            aria-disabled={runDisabled}
            title={runTitle}
            onClick={() => {
              void runActivePython();
            }}
            data-od-id="python-run-button"
            data-py-run
            testId="python-run"
          >
            <PanelGlyph name="play" />
            Run
            <span className="kbd">Ctrl+Enter</span>
          </Button>
          <Button
            size="sm"
            type="button"
            disabled={checkDisabled}
            aria-disabled={checkDisabled}
            title={checkTitle}
            onClick={() => {
              void checkActivePython();
            }}
            data-od-id="python-check-button"
            data-py-check
            testId="python-check"
          >
            <PanelGlyph name="check" />
            Check syntax
            <span className="kbd">Ctrl+Shift+B</span>
          </Button>
          {running ? (
            <Button
              variant="danger"
              size="sm"
              type="button"
              title="Stop the running Python process"
              onClick={() => {
                void stopPythonRun();
              }}
              data-od-id="python-stop-button"
              data-py-stop
              testId="python-stop"
            >
              <PanelGlyph name="stop" />
              Stop
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            type="button"
            title="Clear the output without stopping the process"
            onClick={() => {
              clearPythonOutput();
            }}
            data-od-id="python-clear-button"
            data-py-clear
            testId="python-clear"
          >
            <PanelGlyph name="clear" />
            Clear
          </Button>
        </div>
      </header>
      <div
        className="python-output"
        role="log"
        aria-live="polite"
        aria-label="Python output"
      >
        {!desktop ? (
          <div className="python-disabled-note">
            <Icon name="info" size="sm" />
            <span>
              <strong>Running Python requires the desktop application.</strong> Completion works
              unchanged in this browser build.
            </span>
          </div>
        ) : null}

        {showNonPythonNote ? (
          <div className="python-disabled-note">
            <Icon name="info" size="sm" />
            <span>
              Only Python files can be run. Open a <span className="mono">.py</span> file to use Run
              and Check syntax.
            </span>
          </div>
        ) : null}

        {!desktop ? (
          <div className="py-line" data-stream="meta">
            <span className="py-gutter" />
            <span className="py-text">
              The output panel is shown for consistency; no child process is started here.
            </span>
          </div>
        ) : null}

        {showEmptyState ? (
          <div className="python-empty">
            <strong>Output is empty</strong>
            <span>
              Run the open file to stream stdout and stderr here. Syntax checks compile the file
              without executing it.
            </span>
            {app.workspace.root ? (
              <span className="mono">Working directory: {app.workspace.root}</span>
            ) : null}
          </div>
        ) : null}

        <div data-python-output>
          {lines.map((line, index) => {
            const summary = isSummaryLine(line);
            const summaryClass = summary
              ? line.stream === 'stderr'
                ? 'is-stderr-summary'
                : 'is-summary'
              : undefined;
            return (
              <div
                key={line.id}
                className={cn('py-line', line.loc ? 'is-loc' : undefined, summaryClass)}
                data-stream={displayStream(line)}
                data-testid="python-line"
              >
                <span className="py-gutter">{hasBlankGutter(line) ? '' : index + 1}</span>
                <span className="py-text">
                  {line.loc ? (
                    <button
                      type="button"
                      className="py-jump"
                      title={`Open ${line.loc.relPath} at line ${line.loc.line}`}
                      onClick={() => {
                        if (!line.loc) return;
                        void openFile(line.loc.relPath, {
                          line: line.loc.line,
                          column: line.loc.column ?? 1,
                        });
                      }}
                    >
                      {line.text}
                    </button>
                  ) : (
                    line.text
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
