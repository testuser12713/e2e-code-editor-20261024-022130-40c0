import { hasDesktopBridge, platform } from '../platform';
import { saveTab } from './documents';
import { appStore, type AppStore } from './store';
import type { Tab } from './types';

export type CloseChoice = 'save' | 'discard' | 'cancel';

export type ClosePromptSnapshot = {
  open: boolean;
  tabId: string | null;
  relPath: string | null;
  name: string | null;
};

const CLOSED_PROMPT: ClosePromptSnapshot = {
  open: false,
  tabId: null,
  relPath: null,
  name: null,
};

type PromptRequest = {
  tab: Tab;
  resolve: (choice: CloseChoice) => void;
};

const promptListeners = new Set<() => void>();
const promptQueue: PromptRequest[] = [];

let promptSnapshot: ClosePromptSnapshot = CLOSED_PROMPT;
let pendingPrompt: PromptRequest | null = null;

function emitPrompt(): void {
  for (const listener of promptListeners) listener();
}

export function subscribeClosePrompt(listener: () => void): () => void {
  promptListeners.add(listener);
  return () => {
    promptListeners.delete(listener);
  };
}

export function getClosePromptSnapshot(): ClosePromptSnapshot {
  return promptSnapshot;
}

function presentNextPrompt(): void {
  const next = promptQueue.shift() ?? null;
  pendingPrompt = next;
  promptSnapshot = next
    ? { open: true, tabId: next.tab.id, relPath: next.tab.relPath, name: next.tab.name }
    : CLOSED_PROMPT;
  emitPrompt();
}

function showPrompt(tab: Tab): Promise<CloseChoice> {
  return new Promise<CloseChoice>((resolve) => {
    promptQueue.push({ tab, resolve });
    if (!pendingPrompt) presentNextPrompt();
  });
}

export function resolveClosePrompt(choice: CloseChoice): void {
  const pending = pendingPrompt;
  if (!pending) return;

  pending.resolve(choice);
  presentNextPrompt();
}

let unsubscribeBeforeClose: (() => void) | null = null;

export function initCloseFlow(store: AppStore): void {
  void store;

  unsubscribeBeforeClose?.();
  unsubscribeBeforeClose = platform.app.onBeforeClose(() => {
    void requestCloseWindow();
  });
}

export async function requestCloseTab(tabId: string): Promise<boolean> {
  const state = appStore.getState();
  const tab = state.tabs.tabs.find((candidate) => candidate.id === tabId);

  if (!tab) return true;
  if (!state.tabs.dirty[tabId]) return true;

  const choice = await showPrompt(tab);

  if (choice === 'cancel') return false;
  if (choice === 'save') return saveTab(tabId);
  return true;
}

export async function requestCloseWindow(): Promise<boolean> {
  const state = appStore.getState();
  const dirtyTabs = state.tabs.tabs.filter((tab) => Boolean(state.tabs.dirty[tab.id]));

  for (const tab of dirtyTabs) {
    const mayClose = await requestCloseTab(tab.id);
    if (!mayClose) return false;
  }

  if (hasDesktopBridge) {
    platform.app.confirmClose();
  } else if (typeof window !== 'undefined') {
    window.close();
  }

  return true;
}
