import { describe, expect, it } from 'vitest';

import { tabsReducer } from '../src/state/tabsReducer';
import type { Tab, TabsState } from '../src/state/types';

function tab(id: string, relPath: string): Tab {
  return { id, relPath, name: relPath.split('/').pop() ?? relPath };
}

function emptyState(): TabsState {
  return { tabs: [], activeId: null, dirty: {} };
}

describe('tabsReducer', () => {
  it('opens a tab, appends it to the strip and focuses it', () => {
    const next = tabsReducer(emptyState(), { type: 'tabs/open', tab: tab('a', 'src/a.ts') });

    expect(next.tabs.map((entry) => entry.relPath)).toEqual(['src/a.ts']);
    expect(next.activeId).toBe('a');
    expect(next.dirty).toEqual({});
  });

  it('focuses an already open file instead of opening a second tab', () => {
    const first = tabsReducer(emptyState(), { type: 'tabs/open', tab: tab('a', 'src/a.ts') });
    const second = tabsReducer(first, { type: 'tabs/open', tab: tab('b', 'src/b.ts') });
    const again = tabsReducer(second, { type: 'tabs/open', tab: tab('c', 'src/a.ts') });

    expect(again.tabs.map((entry) => entry.id)).toEqual(['a', 'b']);
    expect(again.tabs.map((entry) => entry.relPath)).toEqual(['src/a.ts', 'src/b.ts']);
    expect(again.activeId).toBe('a');
  });

  it('tracks the dirty map per tab', () => {
    const opened = tabsReducer(emptyState(), { type: 'tabs/open', tab: tab('a', 'src/a.ts') });
    const dirty = tabsReducer(opened, { type: 'tabs/dirty', id: 'a', dirty: true });
    expect(dirty.dirty).toEqual({ a: true });

    const clean = tabsReducer(dirty, { type: 'tabs/dirty', id: 'a', dirty: false });
    expect(clean.dirty).toEqual({});
  });

  it('closes a tab, drops its dirty mark and activates the next neighbour', () => {
    let state = tabsReducer(emptyState(), { type: 'tabs/open', tab: tab('a', 'src/a.ts') });
    state = tabsReducer(state, { type: 'tabs/open', tab: tab('b', 'src/b.ts') });
    state = tabsReducer(state, { type: 'tabs/open', tab: tab('c', 'src/c.ts') });
    state = tabsReducer(state, { type: 'tabs/dirty', id: 'b', dirty: true });
    state = tabsReducer(state, { type: 'tabs/focus', id: 'b' });
    state = tabsReducer(state, { type: 'tabs/close', id: 'b' });

    expect(state.tabs.map((entry) => entry.id)).toEqual(['a', 'c']);
    expect(state.activeId).toBe('c');
    expect(state.dirty).toEqual({});
  });

  it('restores tabs in their saved order and clears the dirty map', () => {
    const restored = tabsReducer(
      { tabs: [tab('old', 'old.ts')], activeId: 'old', dirty: { old: true } },
      {
        type: 'tabs/restore',
        tabs: [tab('b', 'src/b.ts'), tab('a', 'src/a.ts'), tab('c', 'src/c.ts')],
      },
    );

    expect(restored.tabs.map((entry) => entry.relPath)).toEqual([
      'src/b.ts',
      'src/a.ts',
      'src/c.ts',
    ]);
    expect(restored.activeId).toBe('b');
    expect(restored.dirty).toEqual({});
  });
});
