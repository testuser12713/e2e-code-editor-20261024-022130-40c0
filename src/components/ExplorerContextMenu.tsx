import { useEffect, useRef, useState } from 'react';

import { COMMAND_IDS } from '../commands/ids';
import { hasCommand, registerCommands, runCommand } from '../commands/registry';
import { platform } from '../platform';
import { closeTabByPath, openFile } from '../state/documents';
import { appStore } from '../state/store';
import type { TreeNode } from '../state/types';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { ContextMenu } from '../ui/ContextMenu';
import type { MenuEntry } from '../ui/Menu';
import { notify } from '../ui/Notify';
import { PromptDialog } from '../ui/PromptDialog';

export type ExplorerContextMenuProps = {
  node: TreeNode;
  x: number;
  y: number;
  onClose: () => void;
};

type TreeAction = 'create-file' | 'create-dir' | 'rename' | 'delete';

type TreeRequest = { action: TreeAction; node: TreeNode };

const flowListeners = new Set<(request: TreeRequest) => void>();

function requestTreeFlow(action: TreeAction, node: TreeNode): boolean {
  if (flowListeners.size === 0) return false;
  for (const listener of flowListeners) listener({ action, node });
  return true;
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.length > 0) return error.message;
  if (typeof error === 'string' && error.length > 0) return error;
  return fallback;
}

function parentDirectory(relPath: string): string {
  const slash = relPath.lastIndexOf('/');
  return slash === -1 ? '' : relPath.slice(0, slash);
}

function createDirectoryFor(node: TreeNode): string {
  return node.kind === 'dir' ? node.relPath : parentDirectory(node.relPath);
}

function joinRelative(directory: string, name: string): string {
  return directory === '' ? name : `${directory}/${name}`;
}

function displayDirectory(directory: string): string {
  return directory === '' ? 'the workspace root' : directory;
}

function folderName(absPath: string): string {
  const normalized = absPath.replace(/\\/g, '/').replace(/\/+$/, '');
  const name = normalized.split('/').pop();
  return name && name.length > 0 ? name : absPath;
}

function workspaceLabel(): string {
  const root = appStore.getState().workspace.root;
  return root ? folderName(root) : 'the workspace';
}

function nameError(value: string): string | null {
  const name = value.trim();
  if (name.length === 0) return 'Enter a name.';
  if (name === '.' || name === '..') return 'Enter a valid name.';
  if (/[\\/]/.test(name)) return 'A name cannot contain “/” or “\\”.';
  if (name.includes('\0')) return 'A name cannot contain a null character.';
  return null;
}

function failureTitle(action: TreeAction, name: string): string {
  if (action === 'rename') return `${name} can’t be renamed`;
  if (action === 'delete') return `${name} can’t be deleted`;
  return `${name} can’t be created`;
}

function reloadDirectory(relPath: string): void {
  appStore.dispatch({ type: 'workspace/reload', relPath });
}

function revealDirectory(relPath: string): void {
  if (relPath === '') return;
  if (appStore.getState().workspace.expanded[relPath]) return;
  appStore.dispatch({ type: 'workspace/toggle', relPath });
}

function closeTabsUnder(relPath: string): void {
  const prefix = `${relPath}/`;
  const affected = appStore
    .getState()
    .tabs.tabs.filter((tab) => tab.relPath === relPath || tab.relPath.startsWith(prefix))
    .map((tab) => tab.relPath);

  for (const path of affected) {
    closeTabByPath(path);
  }
}

function parseNode(args: unknown): TreeNode | null {
  if (!args || typeof args !== 'object') return null;
  const candidate = (args as { node?: unknown }).node;
  if (!candidate || typeof candidate !== 'object') return null;

  const node = candidate as Partial<TreeNode>;
  if (typeof node.name !== 'string' || typeof node.relPath !== 'string') return null;
  if (node.kind !== 'file' && node.kind !== 'dir') return null;

  return { name: node.name, relPath: node.relPath, kind: node.kind };
}

function startTreeCommand(action: TreeAction, args: unknown): boolean {
  const node = parseNode(args);
  if (!node) {
    notify('Select a file or folder in the explorer first.', 'error');
    return false;
  }
  return requestTreeFlow(action, node);
}

registerCommands([
  {
    id: COMMAND_IDS.newFile,
    title: 'File: New File…',
    run: (args) => startTreeCommand('create-file', args),
  },
  {
    id: COMMAND_IDS.newFolder,
    title: 'File: New Folder…',
    run: (args) => startTreeCommand('create-dir', args),
  },
  {
    id: COMMAND_IDS.rename,
    title: 'File: Rename…',
    run: (args) => startTreeCommand('rename', args),
  },
  {
    id: COMMAND_IDS.delete,
    title: 'File: Delete…',
    run: (args) => startTreeCommand('delete', args),
  },
]);

export function ExplorerContextMenu({ node, x, y, onClose }: ExplorerContextMenuProps) {
  const [flow, setFlow] = useState<TreeRequest | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const menuSelection = useRef(false);
  const flowStarted = useRef(false);

  useEffect(() => {
    const listener = (request: TreeRequest) => {
      flowStarted.current = menuSelection.current;
      menuSelection.current = false;
      setFlow(request);
      setName(request.action === 'rename' ? request.node.name : '');
      setError('');
      setBusy(false);
    };

    flowListeners.add(listener);
    return () => {
      flowListeners.delete(listener);
    };
  }, []);

  const closeFlow = () => {
    busyRef.current = false;
    menuSelection.current = false;
    flowStarted.current = false;
    setBusy(false);
    setFlow(null);
    setName('');
    setError('');
    onClose();
  };

  const handleMenuClose = () => {
    menuSelection.current = false;
    if (flowStarted.current) {
      flowStarted.current = false;
      return;
    }
    onClose();
  };

  const select = (commandId: string) => {
    menuSelection.current = true;
    void runCommand(commandId, { node });
  };

  const items: MenuEntry[] = [
    {
      label: 'New File…',
      icon: 'new-file',
      testId: 'tree-action-new-file',
      onSelect: hasCommand(COMMAND_IDS.newFile) ? () => select(COMMAND_IDS.newFile) : undefined,
    },
    {
      label: 'New Folder…',
      icon: 'new-folder',
      testId: 'tree-action-new-folder',
      onSelect: hasCommand(COMMAND_IDS.newFolder) ? () => select(COMMAND_IDS.newFolder) : undefined,
    },
    { separator: true },
    {
      label: 'Rename',
      icon: 'edit',
      testId: 'tree-action-rename',
      onSelect: hasCommand(COMMAND_IDS.rename) ? () => select(COMMAND_IDS.rename) : undefined,
    },
    {
      label: 'Delete',
      icon: 'trash',
      danger: true,
      testId: 'tree-action-delete',
      onSelect: hasCommand(COMMAND_IDS.delete) ? () => select(COMMAND_IDS.delete) : undefined,
    },
  ];

  const submitName = async () => {
    if (!flow || flow.action === 'delete' || busyRef.current) return;

    const validation = nameError(name);
    if (validation) {
      setError(validation);
      return;
    }

    const action = flow.action;
    const target = flow.node;
    const newName = name.trim();
    const directory = action === 'rename'
      ? parentDirectory(target.relPath)
      : createDirectoryFor(target);
    const relPath = joinRelative(directory, newName);

    if (action === 'rename' && newName === target.name) {
      closeFlow();
      return;
    }

    busyRef.current = true;
    setBusy(true);
    setError('');

    let result;
    try {
      result = action === 'rename'
        ? await platform.manage.rename(target.relPath, relPath)
        : await platform.manage.create(relPath, action === 'create-dir' ? 'dir' : 'file');
    } catch (operationError) {
      result = { ok: false, message: errorMessage(operationError, 'The operation failed.') };
    }

    busyRef.current = false;
    setBusy(false);

    if (!result.ok) {
      setError(result.message);
      notify(result.message, 'error', { title: failureTitle(action, newName) });
      return;
    }

    if (action === 'rename') {
      const fromParent = parentDirectory(target.relPath);
      const toParent = parentDirectory(relPath);
      reloadDirectory(fromParent);
      if (toParent !== fromParent) reloadDirectory(toParent);
      closeTabsUnder(target.relPath);
    } else {
      reloadDirectory(directory);
      revealDirectory(directory);
      if (action === 'create-file') {
        await openFile(relPath);
      }
    }

    closeFlow();
  };

  const confirmDelete = async () => {
    if (!flow || flow.action !== 'delete' || busyRef.current) return;

    const target = flow.node;
    busyRef.current = true;
    setBusy(true);

    let result;
    try {
      result = await platform.manage.remove(target.relPath);
    } catch (operationError) {
      result = { ok: false, message: errorMessage(operationError, 'The operation failed.') };
    }

    busyRef.current = false;
    setBusy(false);

    if (!result.ok) {
      notify(result.message, 'error', { title: failureTitle('delete', target.name) });
      closeFlow();
      return;
    }

    reloadDirectory(parentDirectory(target.relPath));
    closeTabsUnder(target.relPath);
    closeFlow();
  };

  const promptFlow = flow && flow.action !== 'delete' ? flow : null;
  const promptDirectory = promptFlow
    ? promptFlow.action === 'rename'
      ? parentDirectory(promptFlow.node.relPath)
      : createDirectoryFor(promptFlow.node)
    : '';

  const promptTitle = promptFlow
    ? promptFlow.action === 'create-file'
      ? 'New File'
      : promptFlow.action === 'create-dir'
        ? 'New Folder'
        : 'Rename'
    : '';

  const promptIcon = promptFlow
    ? promptFlow.action === 'create-file'
      ? 'new-file'
      : promptFlow.action === 'create-dir'
        ? 'new-folder'
        : 'edit'
    : 'new-file';

  const promptPlaceholder = promptFlow
    ? promptFlow.action === 'create-file'
      ? 'file.ts'
      : promptFlow.action === 'create-dir'
        ? 'folder-name'
        : promptFlow.node.name
    : '';

  return (
    <>
      {flow === null ? (
        <ContextMenu
          x={x}
          y={y}
          label={`File actions for ${node.name}`}
          items={items}
          onClose={handleMenuClose}
          testId="explorer-context-menu"
        />
      ) : null}

      {promptFlow ? (
        <PromptDialog
          open
          title={promptTitle}
          subtitle={`Inside ${displayDirectory(promptDirectory)}`}
          label="Name"
          placeholder={promptPlaceholder}
          value={name}
          error={error || undefined}
          confirmLabel={promptFlow.action === 'rename' ? 'Rename' : 'Create'}
          cancelLabel="Cancel"
          meta="The operation is checked against the workspace root."
          icon={promptIcon}
          testId="tree-name-dialog"
          inputTestId="tree-name-input"
          onValueChange={(value) => {
            setName(value);
            if (error) setError('');
          }}
          onConfirm={() => {
            void submitName();
          }}
          onCancel={closeFlow}
        />
      ) : null}

      {flow && flow.action === 'delete' ? (
        <ConfirmDialog
          open
          title={`Delete ${flow.node.name}?`}
          subtitle={flow.node.relPath}
          description={
            flow.node.kind === 'dir'
              ? 'Forge will remove this folder and everything inside it from the workspace and close any open tabs inside it. This action cannot be undone.'
              : 'Forge will remove this file from the workspace and close its open tab, discarding the unsaved changes marked on that tab. This action cannot be undone.'
          }
          confirmLabel={busy ? 'Deleting…' : 'Delete'}
          cancelLabel="Cancel"
          meta={`Path checked inside ${workspaceLabel()}`}
          tone="danger"
          icon="trash"
          testId="delete-dialog"
          onConfirm={() => {
            void confirmDelete();
          }}
          onCancel={closeFlow}
        />
      ) : null}
    </>
  );
}
