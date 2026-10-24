import { useEffect, useState } from 'react';

import { COMMAND_IDS, COMMAND_KEYBINDINGS } from '../commands/ids';
import { getCommands, hasCommand, runCommand } from '../commands/registry';
import { platform } from '../platform';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { ListBox } from '../ui/ListBox';
import { notify } from '../ui/Notify';

const SHORTCUT_COMMAND_IDS = [
  COMMAND_IDS.commandPalette,
  COMMAND_IDS.quickOpen,
  COMMAND_IDS.projectSearch,
  COMMAND_IDS.save,
  COMMAND_IDS.find,
  COMMAND_IDS.showSettings,
] as const;

const RECENT_LIMIT = 5;

type ShortcutEntry = { id: string; title: string; keybinding: string };

function folderName(absPath: string): string {
  const normalized = absPath.replace(/\\/g, '/').replace(/\/+$/, '');
  return normalized.split('/').pop() ?? absPath;
}

function readShortcuts(): ShortcutEntry[] {
  const commands = new Map(getCommands().map((command) => [command.id, command]));
  const shortcuts: ShortcutEntry[] = [];

  for (const id of SHORTCUT_COMMAND_IDS) {
    const command = commands.get(id);
    if (!command) continue;
    const keybinding = command.keybinding ?? COMMAND_KEYBINDINGS[id];
    if (!keybinding) continue;
    shortcuts.push({ id, title: command.title, keybinding });
  }

  return shortcuts;
}

function readRecentFolders(folders: string[] | null | undefined): string[] {
  if (!Array.isArray(folders)) return [];
  const unique = new Set<string>();
  for (const folder of folders) {
    if (typeof folder !== 'string' || folder.length === 0) continue;
    unique.add(folder);
    if (unique.size === RECENT_LIMIT) break;
  }
  return Array.from(unique);
}

export function WelcomeView() {
  const [recentFolders, setRecentFolders] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    void platform.persist
      .loadRecentFolders()
      .then((folders) => {
        if (!active) return;
        setRecentFolders(readRecentFolders(folders));
      })
      .catch((error: unknown) => {
        if (!active) return;
        setRecentFolders([]);
        const message = error instanceof Error ? error.message : String(error);
        notify(message || 'Could not load recent folders.', 'error');
      });
    return () => {
      active = false;
    };
  }, []);

  const shortcuts = readShortcuts();
  const canOpenFolder = hasCommand(COMMAND_IDS.openFolder);
  const canOpenPath = hasCommand(COMMAND_IDS.openPath);
  const hasRecentFolders = recentFolders.length > 0;

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
              disabled={!hasRecentFolders}
              onClick={() => {
                document.getElementById('recent')?.scrollIntoView({ block: 'start' });
              }}
            >
              Open Recent
            </Button>
          </div>

          <div className="shortcuts" aria-label="Essential keyboard shortcuts">
            {shortcuts.map((shortcut) => (
              <div className="shortcut" key={shortcut.id}>
                <span>{shortcut.title}</span>
                <span className="kbd">{shortcut.keybinding}</span>
              </div>
            ))}
          </div>
        </section>

        {hasRecentFolders ? (
          <section
            className="recent-panel"
            id="recent"
            aria-labelledby="recent-title"
            data-od-id="recent-folders"
            data-testid="recent-folders"
          >
            <div className="recent-head">
              <div>
                <h2 id="recent-title">Open Recent</h2>
                <p>The last five folders stay on this machine.</p>
              </div>
              <span className="badge">{recentFolders.length}</span>
            </div>
            <ListBox
              items={recentFolders}
              variant="recent"
              ariaLabel="Recent folders"
              testId="recent-folder-list"
              getKey={(folder) => folder}
              getLabel={(folder) => folderName(folder)}
              getDetail={(folder) => folder}
              getIcon={() => 'folder'}
              isDisabled={() => !canOpenPath}
              onSelect={(folder) => {
                void runCommand(COMMAND_IDS.openPath, { path: folder });
              }}
            />
            <div className="recent-foot">
              Paths are stored in the local userData folder. Nothing leaves this computer.
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
