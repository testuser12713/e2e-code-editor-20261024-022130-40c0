import { useAppStore } from '../state/store';
import { WelcomeView } from '../views/WelcomeView';

export function EditorPane() {
  const state = useAppStore();

  if (state.workspace.root === null) {
    return <WelcomeView />;
  }

  return (
    <div className="editor-stage" data-od-id="monaco-editor" data-testid="editor-stage">
      <div className="editor-empty">
        <div>
          <h2>No file open</h2>
          <p>Select a file from the explorer to open it in the editor.</p>
        </div>
      </div>
    </div>
  );
}
