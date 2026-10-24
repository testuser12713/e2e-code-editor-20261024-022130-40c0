import type { TreeNode, WorkspaceState } from './types';

export type WorkspaceAction =
  | { type: 'workspace/open'; root: string }
  | { type: 'workspace/close' }
  | { type: 'workspace/list'; relPath: string; nodes: TreeNode[] }
  | { type: 'workspace/toggle'; relPath: string }
  | { type: 'workspace/reload'; relPath: string };

export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  void action;
  return state;
}
