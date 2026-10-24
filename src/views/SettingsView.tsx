export function SettingsView() {
  return (
    <div className="settings-wrap" data-testid="view-settings">
      <div className="settings-page">
        <header className="settings-header">
          <span className="eyebrow">Preferences</span>
          <h1>Settings</h1>
          <p>
            Theme, editor typography, indentation, whitespace and file tree preferences. Every change applies
            immediately and is stored locally on this machine.
          </p>
        </header>
      </div>
    </div>
  );
}
