import { useEffect, useState } from 'react';

import { COMMAND_IDS } from '../commands/ids';
import { hasCommand, runCommand } from '../commands/registry';
import { platform } from '../platform';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';

const SHORTCUTS = [
  { label: 'Command palette', keys: 'Ctrl+Shift+P' },
  { label: 'Quick open', keys: 'Ctrl+P' },
  { label: 'Project search', keys: 'Ctrl+Shift+F' },
  { label: 'Save active file', keys: 'Ctrl+S' },
  { label: 'Find in file', keys: 'Ctrl+F' },
  { label: 'Settings', keys: 'Ctrl+,' },
];

function folderName(absPath: string): string {
  const normalized = absPath.replace(/\\/g, '/').replace(/\/+$/, '');
  return normalized.split('/').pop() ?? absPath;
}

export function WelcomeView() {
  const [recentFolders, setRecentFolders] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    void platform.persist
      .loadRecentFolders()
      .then((folders) => {
        if (!active) return;
        setRecentFolders(Array.isArray(folders) ? folders.filter((folder) => typeof folder === 'string') : []);
      })
      .catch(() => {
        if (active) setRecentFolders([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const canOpenFolder = hasCommand(COMMAND_IDS.openFolder);
  const canOpenPath = hasCommand(COMMAND_IDS.openPath);

  return (
    <div className="welcome" data-od-id="welcome-view" data-testid="welcome-view">
      <div className="welcome-grid">
        <section className="welcome-hero" aria-labelledby="welcome-title">
          <div className="welcome-mark">
            <Icon name="brand" />
          </div>
          <h1 id="welcome-title">Forge</h1>
          <p className="welcome-tagline">
            A local-first code editor for Windows. Open a folder to load its tree, tabs and cursor positions
            exactly where you left them.
          </p>
          <div className="welcome-actions">
            <Button
              variant="primary"
              size="lg"
              disabled={!canOpenFolder}
              data-od-id="open-folder-button"
              onClick={() => {
                void runCommand(COMMAND_IDS.openFolder);
              }}
            >
              <Icon name="folder-open" />
              Open Folder…
            </Button>
            <Button
              size="lg"
              onClick={() => {
                document.getElementById('recent')?.scrollIntoView({ block: 'start' });
              }}
            >
              Open Recent
            </Button>
          </div>

          <div className="shortcuts" aria-label="Essential keyboard shortcuts">
            {SHORTCUTS.map((shortcut) => (
              <div className="shortcut" key={shortcut.label}>
                <span>{shortcut.label}</span>
                <span className="kbd">{shortcut.keys}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="recent-panel" id="recent" aria-labelledby="recent-title" data-od-id="recent-folders">
          <div className="recent-head">
            <div>
              <h2 id="recent-title">Open Recent</h2>
              <p>The last five folders stay on this machine.</p>
            </div>
            <span className="badge">{recentFolders.length}</span>
          </div>
          <div className="recent-list">
            {recentFolders.length === 0 ? (
              <div className="palette-empty">No recent folders yet.</div>
            ) : (
              recentFolders.map((folder) => (
                <button
                  key={folder}
                  type="button"
                  className="recent-item"
                  disabled={!canOpenPath}
                  onClick={() => {
                    void runCommand(COMMAND_IDS.openPath, { path: folder });
                  }}
                >
                  <span className="recent-icon">
                    <Icon name="folder" size="sm" />
                  </span>
                  <span className="recent-copy">
                    <span className="recent-name">{folderName(folder)}</span>
                    <span className="recent-path">{folder}</span>
                  </span>
                </button>
              ))
            )}
          </div>
          <div className="recent-foot">
            Paths are stored in the local userData folder. Nothing leaves this computer.
          </div>
        </section>
      </div>
    </div>
  );
}
