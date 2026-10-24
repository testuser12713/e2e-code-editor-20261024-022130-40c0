import { useState } from 'react';

import { COMMAND_IDS } from '../commands/ids';
import { hasCommand, runCommand } from '../commands/registry';
import { ExplorerContextMenu } from '../components/ExplorerContextMenu';
import { useAppStore } from '../state/store';
import type { TreeNode } from '../state/types';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { TreeRow } from '../ui/TreeRow';

function folderName(absPath: string): string {
  const normalized = absPath.replace(/\\/g, '/').replace(/\/+$/, '');
  return normalized.split('/').pop() ?? absPath;
}

type MenuPosition = { node: TreeNode; x: number; y: number };

export function ExplorerView() {
  const state = useAppStore();
  const [menu, setMenu] = useState<MenuPosition | null>(null);
  const root = state.workspace.root;
  const nodes = root ? state.workspace.listings[root] ?? [] : [];

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
            disabled={!hasCommand(COMMAND_IDS.openFolder)}
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
          {nodes.length === 0 ? (
            <div className="tree-empty">
              <p>This folder has no entries to show.</p>
            </div>
          ) : (
            nodes.map((node) => (
              <TreeRow
                key={node.relPath}
                node={node}
                expanded={Boolean(state.workspace.expanded[node.relPath])}
                active={state.status.relPath === node.relPath}
                onClick={(selected) => {
                  if (selected.kind === 'dir') return;
                  if (!hasCommand(COMMAND_IDS.openFile)) return;
                  void runCommand(COMMAND_IDS.openFile, { relPath: selected.relPath });
                }}
                onContextMenu={(selected, event) => {
                  setMenu({ node: selected, x: event.clientX, y: event.clientY });
                }}
              />
            ))
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
