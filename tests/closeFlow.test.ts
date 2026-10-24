// @vitest-environment jsdom
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { platform } from '../src/platform';
import { CloseGuard } from '../src/shell/CloseGuard';
import {
  getClosePromptSnapshot,
  requestCloseTab,
  requestCloseWindow,
  resolveClosePrompt,
} from '../src/state/closeFlow';
import { openFile, updateDocumentContent } from '../src/state/documents';
import { appStore } from '../src/state/store';

async function openDirtyFile(relPath: string, content = '// changed\n'): Promise<string> {
  expect(await openFile(relPath)).toBe(true);
  const tab = appStore.getState().tabs.tabs.find((candidate) => candidate.relPath === relPath);
  if (!tab) throw new Error(`No tab was opened for ${relPath}`);
  updateDocumentContent(tab.id, content);
  appStore.dispatch({ type: 'tabs/dirty', id: tab.id, dirty: true });
  return tab.id;
}

function closeAllTabs(): void {
  for (const tab of [...appStore.getState().tabs.tabs]) {
    appStore.dispatch({ type: 'tabs/close', id: tab.id });
  }
}

beforeEach(() => {
  closeAllTabs();
});

afterEach(() => {
  while (getClosePromptSnapshot().open) resolveClosePrompt('cancel');
  cleanup();
  vi.restoreAllMocks();
});

describe('close flow', () => {
  it('closes a tab without prompting when it has no unsaved changes', async () => {
    expect(await openFile('src/utils.ts')).toBe(true);
    const tab = appStore.getState().tabs.tabs[0];

    render(createElement(CloseGuard));

    expect(await requestCloseTab(tab.id)).toBe(true);
    expect(screen.queryByTestId('close-prompt')).toBeNull();
  });

  it('keeps the tab open and dirty when Cancel is chosen', async () => {
    const tabId = await openDirtyFile('src/utils.ts');

    render(createElement(CloseGuard));

    const decision = requestCloseTab(tabId);
    const dialog = await screen.findByTestId('close-prompt');

    expect(dialog.getAttribute('role')).toBe('alertdialog');
    expect(screen.getByRole('heading', { name: 'Save changes before closing?' })).toBeTruthy();
    expect(screen.getByText('utils.ts · unsaved')).toBeTruthy();
    expect(screen.getByText('src/utils.ts')).toBeTruthy();

    fireEvent.click(screen.getByTestId('close-prompt-cancel'));

    expect(await decision).toBe(false);
    expect(appStore.getState().tabs.tabs.some((tab) => tab.id === tabId)).toBe(true);
    expect(appStore.getState().tabs.dirty[tabId]).toBe(true);
    expect(screen.queryByTestId('close-prompt')).toBeNull();
  });

  it('writes the pending content before allowing the tab to close when Save is chosen', async () => {
    const write = vi.spyOn(platform.files, 'write').mockResolvedValue({ ok: true });
    const tabId = await openDirtyFile('src/utils.ts', '// saved content\n');

    render(createElement(CloseGuard));

    const decision = requestCloseTab(tabId);
    await screen.findByTestId('close-prompt');
    fireEvent.click(screen.getByTestId('close-prompt-save'));

    expect(await decision).toBe(true);
    expect(write).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledWith('src/utils.ts', '// saved content\n', 'lf');
    expect(appStore.getState().tabs.dirty[tabId]).toBeUndefined();
  });

  it('allows the tab to close without saving when Don’t Save is chosen', async () => {
    const write = vi.spyOn(platform.files, 'write').mockResolvedValue({ ok: true });
    const tabId = await openDirtyFile('src/utils.ts');

    render(createElement(CloseGuard));

    const decision = requestCloseTab(tabId);
    await screen.findByTestId('close-prompt');
    fireEvent.click(screen.getByTestId('close-prompt-discard'));

    expect(await decision).toBe(true);
    expect(write).not.toHaveBeenCalled();
    expect(appStore.getState().tabs.dirty[tabId]).toBe(true);
  });

  it('prompts for every dirty tab in turn before the window may close', async () => {
    const write = vi.spyOn(platform.files, 'write').mockResolvedValue({ ok: true });
    const close = vi.spyOn(window, 'close').mockImplementation(() => undefined);

    const firstId = await openDirtyFile('src/utils.ts', '// first\n');
    const secondId = await openDirtyFile('src/index.ts', '// second\n');

    render(createElement(CloseGuard));

    const decision = requestCloseWindow();

    await screen.findByText('utils.ts · unsaved');
    fireEvent.click(screen.getByTestId('close-prompt-save'));

    await screen.findByText('index.ts · unsaved');
    fireEvent.click(screen.getByTestId('close-prompt-discard'));

    expect(await decision).toBe(true);
    expect(write).toHaveBeenCalledWith('src/utils.ts', '// first\n', 'lf');
    expect(appStore.getState().tabs.dirty[firstId]).toBeUndefined();
    expect(appStore.getState().tabs.dirty[secondId]).toBe(true);
    await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
  });

  it('stops closing the window when a later prompt is cancelled', async () => {
    const write = vi.spyOn(platform.files, 'write').mockResolvedValue({ ok: true });
    const close = vi.spyOn(window, 'close').mockImplementation(() => undefined);

    await openDirtyFile('src/utils.ts', '// first\n');
    await openDirtyFile('src/index.ts', '// second\n');

    render(createElement(CloseGuard));

    const decision = requestCloseWindow();

    await screen.findByText('utils.ts · unsaved');
    fireEvent.click(screen.getByTestId('close-prompt-discard'));

    await screen.findByText('index.ts · unsaved');
    fireEvent.click(screen.getByTestId('close-prompt-cancel'));

    expect(await decision).toBe(false);
    expect(write).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
  });
});
