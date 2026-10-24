// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppState, Settings } from '../src/state/types';

const mocks = vi.hoisted(() => ({
  loadSettings: vi.fn(),
  saveSettings: vi.fn(),
  notify: vi.fn(),
}));

vi.mock('../src/platform', () => ({
  platform: {
    persist: {
      loadSettings: mocks.loadSettings,
      saveSettings: mocks.saveSettings,
    },
  },
}));

vi.mock('../src/ui/Notify', () => ({
  notify: mocks.notify,
}));

import { settingsReducer } from '../src/state/settingsReducer';
import {
  SETTINGS_SAVE_DEBOUNCE_MS,
  initSettingsSync,
  type SettingsSyncStore,
} from '../src/state/settingsSync';
import { DEFAULT_SETTINGS, INITIAL_STATE } from '../src/state/store';

function createTestStore(initial: Settings = DEFAULT_SETTINGS): SettingsSyncStore {
  let state: AppState = { ...INITIAL_STATE, settings: { ...initial } };
  const listeners = new Set<() => void>();

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispatch: (action) => {
      const nextSettings = settingsReducer(state.settings, action);
      if (nextSettings === state.settings) return;
      state = { ...state, settings: nextSettings };
      for (const listener of listeners) listener();
    },
  };
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

beforeEach(() => {
  mocks.loadSettings.mockReset();
  mocks.saveSettings.mockReset();
  mocks.notify.mockReset();
  mocks.saveSettings.mockResolvedValue({ ok: true });

  document.documentElement.removeAttribute('data-theme');
  document.documentElement.style.removeProperty('--editor-font-size');
  document.documentElement.style.removeProperty('--tree-font-size');
  document.documentElement.style.removeProperty('--editor-tab-size');
});

afterEach(() => {
  vi.useRealTimers();
});

describe('settings sync', () => {
  it('falls back to the defaults and reports an error when no settings are returned', async () => {
    mocks.loadSettings.mockResolvedValue(null);

    const store = createTestStore();
    const dispose = initSettingsSync(store);

    await vi.waitFor(() => {
      expect(mocks.notify).toHaveBeenCalledTimes(1);
    });

    expect(store.getState().settings).toEqual(DEFAULT_SETTINGS);
    expect(mocks.notify).toHaveBeenCalledWith(expect.any(String), 'error');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    dispose();
  });

  it('falls back to the defaults when the load rejects', async () => {
    mocks.loadSettings.mockRejectedValue(new Error('settings file is unreadable'));

    const store = createTestStore({ ...DEFAULT_SETTINGS, theme: 'light', fontSize: 20 });
    const dispose = initSettingsSync(store);

    await vi.waitFor(() => {
      expect(mocks.notify).toHaveBeenCalledWith(
        expect.stringContaining('settings file is unreadable'),
        'error',
      );
    });

    expect(store.getState().settings).toEqual(DEFAULT_SETTINGS);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    dispose();
  });

  it('writes changes back once, after the debounce delay', async () => {
    vi.useFakeTimers();
    mocks.loadSettings.mockResolvedValue({ ...DEFAULT_SETTINGS });

    const store = createTestStore();
    const dispose = initSettingsSync(store);

    await vi.advanceTimersByTimeAsync(0);
    await flushMicrotasks();
    expect(mocks.notify).not.toHaveBeenCalled();
    expect(mocks.saveSettings).not.toHaveBeenCalled();

    store.dispatch({ type: 'settings/update', patch: { fontSize: 18 } });
    store.dispatch({ type: 'settings/update', patch: { fontSize: 20 } });
    expect(mocks.saveSettings).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(SETTINGS_SAVE_DEBOUNCE_MS - 1);
    expect(mocks.saveSettings).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(mocks.saveSettings).toHaveBeenCalledTimes(1);
    expect(mocks.saveSettings).toHaveBeenCalledWith(
      expect.objectContaining({ fontSize: 20, theme: 'dark' }),
    );

    dispose();
  });

  it('applies the loaded theme and font sizes to the document immediately', async () => {
    mocks.loadSettings.mockResolvedValue({
      ...DEFAULT_SETTINGS,
      theme: 'light',
      fontSize: 18,
      treeFontSize: 16,
      tabSize: 4,
    });

    const store = createTestStore();
    const dispose = initSettingsSync(store);

    await vi.waitFor(() => {
      expect(store.getState().settings.theme).toBe('light');
    });

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(document.documentElement.style.getPropertyValue('--editor-font-size')).toBe('18px');
    expect(document.documentElement.style.getPropertyValue('--tree-font-size')).toBe('16px');
    expect(document.documentElement.style.getPropertyValue('--editor-tab-size')).toBe('4');

    store.dispatch({
      type: 'settings/update',
      patch: { theme: 'dark', fontSize: 22, treeFontSize: 15 },
    });

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.style.getPropertyValue('--editor-font-size')).toBe('22px');
    expect(document.documentElement.style.getPropertyValue('--tree-font-size')).toBe('15px');

    dispose();
  });
});
