import { Button } from '../ui/Button';

type PanelGlyphName = 'terminal' | 'play' | 'check' | 'clear';

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
    </svg>
  );
}

export function PythonPanel() {
  return (
    <section
      className="python-panel"
      aria-label="Python output"
      data-od-id="python-output-panel"
      data-testid="python-panel"
      data-python-panel
    >
      <header className="python-head">
        <div className="python-id">
          <span className="python-file">
            <PanelGlyph name="terminal" />
            <span data-python-file-name />
          </span>
          <span className="python-interpreter" data-python-interpreter />
          <span className="badge" data-python-state />
        </div>
        <div className="python-actions">
          <Button
            variant="primary"
            size="sm"
            type="button"
            disabled
            title="Save the open file and run it"
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
            disabled
            title="Compile the open file without running it"
            data-od-id="python-check-button"
            data-py-check
            testId="python-check"
          >
            <PanelGlyph name="check" />
            Check syntax
            <span className="kbd">Ctrl+Shift+B</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            type="button"
            disabled
            title="Clear the output without stopping the process"
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
        data-python-output
      />
    </section>
  );
}
