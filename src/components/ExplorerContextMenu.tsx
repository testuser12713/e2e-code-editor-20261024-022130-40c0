import { COMMAND_IDS } from '../commands/ids';
import { hasCommand, runCommand } from '../commands/registry';
import type { TreeNode } from '../state/types';
import { ContextMenu } from '../ui/ContextMenu';
import type { MenuEntry } from '../ui/Menu';

export type ExplorerContextMenuProps = {
  node: TreeNode;
  x: number;
  y: number;
  onClose: () => void;
};

export function ExplorerContextMenu({ node, x, y, onClose }: ExplorerContextMenuProps) {
  const action = (commandId: string) => {
    if (!hasCommand(commandId)) return undefined;
    return () => {
      void runCommand(commandId, { node });
    };
  };

  const items: MenuEntry[] = [
    { label: 'New File…', icon: 'new-file', onSelect: action(COMMAND_IDS.newFile) },
    { label: 'New Folder…', icon: 'new-folder', onSelect: action(COMMAND_IDS.newFolder) },
    { separator: true },
    { label: 'Rename', icon: 'edit', onSelect: action(COMMAND_IDS.rename) },
    { label: 'Delete', icon: 'trash', danger: true, onSelect: action(COMMAND_IDS.delete) },
  ];

  return (
    <ContextMenu
      x={x}
      y={y}
      label={`File actions for ${node.name}`}
      items={items}
      onClose={onClose}
      testId="explorer-context-menu"
    />
  );
}
