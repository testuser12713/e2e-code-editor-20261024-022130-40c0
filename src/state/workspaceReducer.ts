import type { TreeNode, WorkspaceState } from './types';

export type WorkspaceAction =
  | { type: 'workspace/open'; root: string }
  | { type: 'workspace/close' }
  | { type: 'workspace/list'; relPath: string; nodes: TreeNode[] }
  | { type: 'workspace/toggle'; relPath: string }
  | { type: 'workspace/reload'; relPath: string };

export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case 'workspace/open':
      return {
        root: action.root,
        listings: {},
        expanded: {},
      };
    case 'workspace/close':
      return {
        root: null,
        listings: {},
        expanded: {},
      };
    case 'workspace/list':
      return {
        ...state,
        listings: {
          ...state.listings,
          [action.relPath]: action.nodes,
        },
      };
    case 'workspace/toggle':
      return {
        ...state,
        expanded: {
          ...state.expanded,
          [action.relPath]: !state.expanded[action.relPath],
        },
      };
    case 'workspace/reload': {
      const listings = { ...state.listings };
      delete listings[action.relPath];
      return { ...state, listings };
    }
    default:
      return state;
  }
}
