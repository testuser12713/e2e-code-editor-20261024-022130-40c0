import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';

import { COMMAND_IDS, COMMAND_KEYBINDINGS } from '../commands/ids';
import {
  getCommands,
  registerCommands,
  runCommand,
  type Command,
} from '../commands/registry';
import { fuzzyFilter } from '../lib/fuzzy';
import { type IconName } from '../ui/Icon';
import { ListBox } from '../ui/ListBox';
import { Palette, revealPaletteRow, type PaletteHint } from '../ui/Palette';

export type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
};

const GROUP_ORDER = [
  'View',
  'Workspace',
  'File',
  'Editor',
  'File management',
  'Application',
  'Commands',
] as const;

const GROUP_PREFIXES: { prefix: string; group: string }[] = [
  { prefix: 'view.', group: 'View' },
  { prefix: 'workspace.', group: 'Workspace' },
  { prefix: 'file.', group: 'File' },
  { prefix: 'editor.', group: 'Editor' },
  { prefix: 'search.', group: 'Editor' },
  { prefix: 'tree.', group: 'File management' },
  { prefix: 'app.', group: 'Application' },
];

const COMMAND_ICONS: Record<string, IconName> = {
  [COMMAND_IDS.showExplorer]: 'layout',
  [COMMAND_IDS.showSearch]: 'search',
  [COMMAND_IDS.showSettings]: 'settings',
  [COMMAND_IDS.commandPalette]: 'command',
  [COMMAND_IDS.openFolder]: 'folder',
  [COMMAND_IDS.openPath]: 'folder-open',
  [COMMAND_IDS.refreshWorkspace]: 'refresh',
  [COMMAND_IDS.openFile]: 'file',
  [COMMAND_IDS.save]: 'save',
  [COMMAND_IDS.saveAll]: 'save',
  [COMMAND_IDS.closeTab]: 'close',
  [COMMAND_IDS.quickOpen]: 'file',
  [COMMAND_IDS.find]: 'search',
  [COMMAND_IDS.replace]: 'edit',
  [COMMAND_IDS.projectSearch]: 'search',
  [COMMAND_IDS.newFile]: 'new-file',
  [COMMAND_IDS.newFolder]: 'new-folder',
  [COMMAND_IDS.rename]: 'edit',
  [COMMAND_IDS.delete]: 'trash',
  [COMMAND_IDS.about]: 'info',
  [COMMAND_IDS.resetLocalData]: 'trash',
};

const COMMAND_HINTS: PaletteHint[] = [
  { keys: '↑↓', label: 'Navigate' },
  { keys: 'Enter', label: 'Run' },
  { keys: 'Esc', label: 'Close' },
];

const openListeners = new Set<() => void>();

function requestOpen(): void {
  for (const listener of openListeners) listener();
}

registerCommands([
  {
    id: COMMAND_IDS.commandPalette,
    title: 'View: Command Palette',
    keybinding: COMMAND_KEYBINDINGS[COMMAND_IDS.commandPalette],
    run: () => {
      requestOpen();
      return true;
    },
  },
]);

function groupForCommand(command: Command): string {
  const match = GROUP_PREFIXES.find((entry) => command.id.startsWith(entry.prefix));
  return match ? match.group : 'Commands';
}

function iconForCommand(command: Command): IconName {
  return COMMAND_ICONS[command.id] ?? 'command';
}

type CommandGroup = { label: string; commands: Command[] };

function groupCommands(commands: Command[]): CommandGroup[] {
  const buckets = new Map<string, Command[]>();

  for (const command of commands) {
    const label = groupForCommand(command);
    const bucket = buckets.get(label);
    if (bucket) {
      bucket.push(command);
    } else {
      buckets.set(label, [command]);
    }
  }

  const ordered = GROUP_ORDER.filter((label) => buckets.has(label));
  const extras = Array.from(buckets.keys()).filter(
    (label) => !(GROUP_ORDER as readonly string[]).includes(label),
  );

  return [...ordered, ...extras].map((label) => ({
    label,
    commands: buckets.get(label) ?? [],
  }));
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [commands, setCommands] = useState<Command[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const isOpen = open || internalOpen;

  useEffect(() => {
    const listener = () => setInternalOpen(true);
    openListeners.add(listener);
    return () => {
      openListeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setCommands(getCommands());
    setQuery('');
    setSelectedIndex(0);
  }, [isOpen]);

  const close = () => {
    setInternalOpen(false);
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      setInternalOpen(false);
      onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const filtered = useMemo(
    () => fuzzyFilter(commands, query, (command) => command.title),
    [commands, query],
  );

  const groups = useMemo(() => groupCommands(filtered), [filtered]);
  const ordered = useMemo(
    () => groups.flatMap((group) => group.commands),
    [groups],
  );

  const activeIndex = ordered.length === 0 ? -1 : Math.min(selectedIndex, ordered.length - 1);
  const activeCommand = activeIndex >= 0 ? ordered[activeIndex] : null;

  useLayoutEffect(() => {
    if (!isOpen || !activeCommand) return;
    revealPaletteRow(
      document.querySelector<HTMLElement>('[data-testid="command-palette"] .palette-list'),
    );
  }, [isOpen, activeCommand?.id]);

  const activate = (command: Command) => {
    setInternalOpen(false);
    onClose();
    void runCommand(command.id);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (ordered.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex(Math.min(activeIndex + 1, ordered.length - 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex(Math.max(activeIndex - 1, 0));
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      setSelectedIndex(0);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      setSelectedIndex(ordered.length - 1);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      if (activeCommand) activate(activeCommand);
    }
  };

  return (
    <Palette
      open={isOpen}
      label="Command palette"
      placeholder="Type a command"
      icon="command"
      query={query}
      onQueryChange={(value) => {
        setQuery(value);
        setSelectedIndex(0);
      }}
      onClose={close}
      onKeyDown={handleKeyDown}
      testId="command-palette"
      hints={COMMAND_HINTS}
      footer={
        <span>
          {filtered.length} available command{filtered.length === 1 ? '' : 's'} · fuzzy filtered
        </span>
      }
    >
      {filtered.length === 0 ? (
        <div className="palette-empty">No command matches that query.</div>
      ) : (
        groups.map((group) => (
          <div key={group.label} className="palette-group-block">
            <div className="palette-group">{group.label}</div>
            <ListBox
              items={group.commands}
              getKey={(command) => command.id}
              getLabel={(command) => command.title}
              getIcon={(command) => iconForCommand(command)}
              getTrailing={(command) =>
                command.keybinding ? <span className="kbd">{command.keybinding}</span> : null
              }
              selectedKey={activeCommand?.id ?? null}
              onSelect={activate}
              ariaLabel={group.label}
            />
          </div>
        ))
      )}
    </Palette>
  );
}
