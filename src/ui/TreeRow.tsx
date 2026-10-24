import type { MouseEvent } from 'react';

import { cn } from '../lib/cn';
import type { TreeNode } from '../state/types';
import { Icon } from './Icon';

export type TreeRowProps = {
  node: TreeNode;
  depth?: number;
  expanded?: boolean;
  active?: boolean;
  badge?: string;
  onClick?: (node: TreeNode) => void;
  onContextMenu?: (node: TreeNode, event: MouseEvent<HTMLElement>) => void;
};

export function TreeRow({ node, depth = 0, expanded = false, active = false, badge, onClick, onContextMenu }: TreeRowProps) {
  return (
    <button
      type="button"
      role="treeitem"
      aria-expanded={node.kind === 'dir' ? expanded : undefined}
      aria-current={active ? 'page' : undefined}
      className={cn('tree-row', active ? 'is-active' : undefined)}
      style={{ paddingLeft: 4 + depth * 13 }}
      onClick={() => onClick?.(node)}
      onContextMenu={(event) => {
        event.preventDefault();
        onContextMenu?.(node, event);
      }}
    >
      {node.kind === 'dir' ? (
        <span className="tree-caret">
          <Icon name="chevron" size="sm" />
        </span>
      ) : (
        <span className="tree-spacer" />
      )}
      <Icon name={node.kind === 'dir' ? 'folder' : 'file'} size="sm" className="tree-icon" />
      <span className="tree-label">{node.name}</span>
      {badge ? <span className="tree-badge">{badge}</span> : null}
    </button>
  );
}
