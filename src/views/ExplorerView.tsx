import { Fragment, useEffect, useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';

import { COMMAND_IDS, COMMAND_KEYBINDINGS } from '../commands/ids';
import { hasCommand, registerCommands, runCommand } from '../commands/registry';
import { ExplorerContextMenu } from '../components/ExplorerContextMenu';
import { platform } from '../platform';
import { appStore, useAppStore } from '../state/store';
import type { TreeNode } from '../state/types';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { notify } from '../ui/Notify';
import { TreeRow } from '../ui/TreeRow';

const ROOT_LISTING = '';

const BINARY_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'bmp',
  'ico',
  'tif',
  'tiff',
  'psd',
  'pdf',
  'zip',
  'gz',
  'tar',
  'rar',
  '7z',
  'exe',
  'dll',
  'so',
  'dylib',
  'bin',
  'wasm',
  'class',
  'jar',
  'mp3',
  'mp4',
  'mov',
  'avi',
  'mkv',
  'wav',
  'flac',
  'ogg',
  'woff',
  'woff2',
  'ttf',
  'otf',
  'eot',
  'sqlite',
  'db',
]);

function folderName(absPath: string): string {
  const normalized = absPath.replace(/\\/g, '/').replace(/\/+$/, '');
  const name = normalized.split('/').pop();
  return name && name.length > 0 ? name : absPath;
}

function badgeForNode(node: TreeNode): string | undefined {
  if (node.kind !== 'file') return undefined;
  const extension = node.name.includes('.') ? node.name.split('.').pop() ?? '' : '';
  return BINARY_EXTENSIONS.has(extension.toLowerCase()) ? 'BIN' : undefined;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) return error.message;
  if (typeof error === 'string' && error.length > 0) return error;
  return 'The folder could not be read.';
}

async function loadDirectory(relPath: string): Promise<boolean> {
  const requestedRoot = appStore.getState().workspace.root;
  if (requestedRoot === null) return false;

  try {
    const nodes = await platform.workspace.listDir(relPath);
    if (appStore.getState().workspace.root !== requestedRoot) return false;
    appStore.dispatch({
      type: 'workspace/list',
      relPath,
      nodes: Array.isArray(nodes) ? nodes : [],
    });
    return true;
  } catch (error) {
    if (appStore.getState().workspace.root === requestedRoot) {
      notify(errorMessage(error), 'error');
    }
    return false;
  }
}

async function openWorkspaceFolder(absPath: string): Promise<boolean> {
  try {
    const result = await platform.workspace.openFolder(absPath);
    if (!result.ok) {
      notify(result.message, 'error');
      return false;
    }

    let root = absPath;
    try {
      const resolved = await platform.workspace.getRoot();
      if (typeof resolved === 'string' && resolved.length > 0) root = resolved;
    } catch {
    }

    appStore.dispatch({ type: 'workspace/open', root });
    appStore.dispatch({ type: 'view/showExplorer' });

    try {
      await platform.persist.addRecentFolder(root);
    } catch {
    }

    return true;
  } catch (error) {
    notify(errorMessage(error), 'error');
    return false;
  }
}

async function openFolderFromDialog(): Promise<boolean> {
  try {
    const selected = await platform.workspace.openDialog();
    if (typeof selected !== 'string' || selected.length === 0) return false;
    return openWorkspaceFolder(selected);
  } catch (error) {
    notify(errorMessage(error), 'error');
    return false;
  }
}

async function openWorkspacePath(args: unknown): Promise<boolean> {
  const candidate = args && typeof args === 'object'
    ? (args as { path?: unknown }).path
    : undefined;

  if (typeof candidate !== 'string' || candidate.trim().length === 0) {
    notify('A folder path is required.', 'error');
    return false;
  }

  return openWorkspaceFolder(candidate);
}

async function refreshWorkspace(): Promise<boolean> {
  const workspace = appStore.getState().workspace;
  if (workspace.root === null) return false;

  const expandedPaths = Object.keys(workspace.expanded).filter(
    (relPath) => workspace.expanded[relPath],
  );
  const paths = [ROOT_LISTING, ...expandedPaths];

  for (const relPath of paths) {
    appStore.dispatch({ type: 'workspace/reload', relPath });
  }

  const results = await Promise.all(paths.map((relPath) => loadDirectory(relPath)));
  return results.every(Boolean);
}

registerCommands([
  {
    id: COMMAND_IDS.openFolder,
    title: 'Workspace: Open Folder…',
    keybinding: COMMAND_KEYBINDINGS[COMMAND_IDS.openFolder],
    run: () => openFolderFromDialog(),
  },
  {
    id: COMMAND_IDS.openPath,
    title: 'Workspace: Open Recent Folder',
    run: (args) => openWorkspacePath(args),
  },
  {
    id: COMMAND_IDS.refreshWorkspace,
    title: 'Workspace: Refresh',
    run: () => refreshWorkspace(),
  },
]);

type MenuPosition = { node: TreeNode; x: number; y: number };

export function ExplorerView() {
  const state = useAppStore();
  const [menu, setMenu] = useState<MenuPosition | null>(null);

  const { root, listings, expanded } = state.workspace;
  const rootNodes = listings[ROOT_LISTING];
  const activePath = state.status.relPath;
  const expandedKey = Object.keys(expanded)
    .filter((relPath) => expanded[relPath])
    .sort()
    .join('\n');

  useEffect(() => {
    if (root === null) return;

    if (rootNodes === undefined) {
      void loadDirectory(ROOT_LISTING);
    }

    if (expandedKey === '') return;
    for (const relPath of expandedKey.split('\n')) {
      if (listings[relPath] === undefined) {
        void loadDirectory(relPath);
      }
    }
  }, [root, rootNodes, expandedKey, listings]);

  const toggleDirectory = (node: TreeNode) => {
    const current = appStore.getState();
    const wasExpanded = Boolean(current.workspace.expanded[node.relPath]);
    appStore.dispatch({ type: 'workspace/toggle', relPath: node.relPath });

    if (!wasExpanded && current.workspace.listings[node.relPath] === undefined) {
      void loadDirectory(node.relPath);
    }
  };

  const activateNode = (node: TreeNode) => {
    if (node.kind === 'dir') {
      toggleDirectory(node);
      return;
    }

    if (!hasCommand(COMMAND_IDS.openFile)) {
      notify('Opening files is not available yet.', 'info');
      return;
    }

    void runCommand(COMMAND_IDS.openFile, { relPath: node.relPath });
  };

  const showContextMenu = (node: TreeNode, event: MouseEvent<HTMLElement>) => {
    setMenu({ node, x: event.clientX, y: event.clientY });
  };

  const renderNodes = (nodes: TreeNode[], depth: number): ReactNode[] =>
    nodes.map((node) => {
      const isDirectory = node.kind === 'dir';
      const isExpanded = isDirectory && Boolean(expanded[node.relPath]);
      const children = isExpanded ? listings[node.relPath] : undefined;

      return (
        <Fragment key={node.relPath}>
          <TreeRow
            node={node}
            depth={depth}
            expanded={isExpanded}
            active={activePath === node.relPath}
            badge={badgeForNode(node)}
            testId={`tree-row-${node.relPath}`}
            onClick={activateNode}
            onContextMenu={showContextMenu}
          />
          {isDirectory && isExpanded && children ? renderNodes(children, depth + 1) : null}
        </Fragment>
      );
    });

  const openFolderDisabled = !hasCommand(COMMAND_IDS.openFolder);

  return (
    <div className="explorer-pane" data-testid="view-explorer">
      <div className="workspace-name">
        <Icon name="folder" size="sm" />
        <span>{root ? folderName(root) : 'No folder open'}</span>
      </div>

      {root === null ? (
        <div className="tree-empty">
          <p>Open a folder to build the workspace tree. Forge only reads inside that folder.</p>
          <Button
            size="sm"
            disabled={openFolderDisabled}
            testId="explorer-open-folder"
            onClick={() => {
              void runCommand(COMMAND_IDS.openFolder);
            }}
          >
            <Icon name="folder-open" size="sm" />
            Open Folder…
          </Button>
        </div>
      ) : (
        <div className="tree" role="tree" aria-label="Workspace files">
          {rootNodes === undefined ? null : rootNodes.length === 0 ? (
            <div className="tree-empty">
              <p>This folder has no entries to show.</p>
            </div>
          ) : (
            renderNodes(rootNodes, 0)
          )}
        </div>
      )}

      {menu ? (
        <ExplorerContextMenu
          node={menu.node}
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
        />
      ) : null}
    </div>
  );
}
