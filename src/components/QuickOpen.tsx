import { useEffect, useMemo, useState } from 'react';

import { COMMAND_IDS, COMMAND_KEYBINDINGS } from '../commands/ids';
import { registerCommands, runCommand } from '../commands/registry';
import { fuzzyFilter } from '../lib/fuzzy';
import { platform } from '../platform';
import { useAppStore } from '../state/store';
import { Palette, type PaletteGroup } from '../ui/Palette';

export type QuickOpenProps = {
  open: boolean;
  onClose: () => void;
};

const openListeners = new Set<() => void>();

function requestOpen(): void {
  for (const listener of openListeners) listener();
}

registerCommands([
  {
    id: COMMAND_IDS.quickOpen,
    title: 'File: Quick Open',
    keybinding: COMMAND_KEYBINDINGS[COMMAND_IDS.quickOpen],
    run: () => {
      requestOpen();
      return true;
    },
  },
]);

function baseName(relPath: string): string {
  const normalized = relPath.replace(/\\/g, '/');
  return normalized.split('/').pop() || normalized;
}

function workspaceName(root: string | null): string {
  if (!root) return 'the workspace';
  const normalized = root.replace(/[\\/]+$/, '');
  return normalized.split(/[\\/]/).pop() || normalized;
}

export function QuickOpen({ open, onClose }: QuickOpenProps) {
  const root = useAppStore().workspace.root;
  const [internalOpen, setInternalOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [files, setFiles] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const isOpen = open || internalOpen;

  useEffect(() => {
    const listener = () => setInternalOpen(true);
    openListeners.add(listener);
    return () => {
      openListeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;

    setQuery('');
    setFiles([]);
    setSelectedId(null);
    let cancelled = false;

    platform.quickOpen
      .listFiles()
      .then((list) => {
        if (cancelled) return;
        setFiles(Array.isArray(list) ? list.filter((entry) => typeof entry === 'string') : []);
      })
      .catch(() => {
        if (cancelled) return;
        setFiles([]);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const filtered = useMemo(
    () => fuzzyFilter(files, query, (relPath) => relPath),
    [files, query],
  );

  useEffect(() => {
    if (!isOpen) return;
    setSelectedId((current) => {
      if (filtered.length === 0) return null;
      return current && filtered.includes(current) ? current : filtered[0];
    });
  }, [isOpen, filtered]);

  const groups = useMemo<PaletteGroup[]>(() => {
    if (filtered.length === 0) return [];
    return [
      {
        id: 'workspace-files',
        label: 'Workspace files',
        items: filtered.map((relPath) => ({
          id: relPath,
          label: baseName(relPath),
          detail: relPath,
          icon: 'file' as const,
          keybinding: relPath === selectedId ? 'Enter' : undefined,
        })),
      },
    ];
  }, [filtered, selectedId]);

  const close = () => {
    setInternalOpen(false);
    onClose();
  };

  const activate = (relPath: string) => {
    setInternalOpen(false);
    onClose();
    void runCommand(COMMAND_IDS.openFile, { relPath });
  };

  const name = workspaceName(root);

  return (
    <Palette
      open={isOpen}
      label="Quick open"
      placeholder="Search files by name"
      icon="search"
      query={query}
      onQueryChange={setQuery}
      groups={groups}
      selectedId={selectedId}
      onSelectedChange={setSelectedId}
      onSelect={(item) => activate(item.id)}
      onClose={close}
      emptyMessage="No workspace file matches that query."
      footer={<span>{`Fuzzy match across all files in ${name}`}</span>}
      testId="quick-open"
    />
  );
}
