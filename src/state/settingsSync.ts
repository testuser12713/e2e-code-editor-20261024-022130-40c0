import { platform } from '../platform';
import { notify } from '../ui/Notify';
import { DEFAULT_SETTINGS } from './store';
import type { SettingsAction } from './settingsReducer';
import type { AppState, Settings } from './types';

export type SettingsSyncStore = {
  getState: () => AppState;
  subscribe: (listener: () => void) => () => void;
  dispatch: (action: SettingsAction) => void;
};

export const SETTINGS_SAVE_DEBOUNCE_MS = 300;

const THEME_ATTRIBUTE = 'data-theme';
const EDITOR_FONT_SIZE_VARIABLE = '--editor-font-size';
const TREE_FONT_SIZE_VARIABLE = '--tree-font-size';
const EDITOR_TAB_SIZE_VARIABLE = '--editor-tab-size';

const LOAD_FAILED_MESSAGE = 'No saved settings were found; Forge is using the default settings.';
const SAVE_FAILED_MESSAGE = 'Settings could not be saved.';

function describeError(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) return error.message.trim();
  if (typeof error === 'string' && error.trim().length > 0) return error.trim();
  return 'Unknown error';
}

function loadFailure(answer: unknown): string | null {
  if (answer === null || answer === undefined) return LOAD_FAILED_MESSAGE;
  if (typeof answer === 'object' && 'ok' in answer && (answer as { ok: unknown }).ok === false) {
    const message = (answer as { message?: unknown }).message;
    return typeof message === 'string' && message.length > 0 ? message : LOAD_FAILED_MESSAGE;
  }
  return null;
}

export function applySettingsToDocument(settings: Settings): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.setAttribute(THEME_ATTRIBUTE, settings.theme);
  root.style.setProperty(EDITOR_FONT_SIZE_VARIABLE, `${settings.fontSize}px`);
  root.style.setProperty(TREE_FONT_SIZE_VARIABLE, `${settings.treeFontSize}px`);
  root.style.setProperty(EDITOR_TAB_SIZE_VARIABLE, String(settings.tabSize));
}

async function saveSettings(settings: Settings): Promise<void> {
  try {
    const result = await platform.persist.saveSettings(settings);
    if (!result.ok) {
      notify(result.message.length > 0 ? result.message : SAVE_FAILED_MESSAGE, 'error');
    }
  } catch (error) {
    notify(`${SAVE_FAILED_MESSAGE} ${describeError(error)}`.trim(), 'error');
  }
}

export function initSettingsSync(store: SettingsSyncStore): () => void {
  let disposed = false;
  let hydrating = true;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let applied = store.getState().settings;

  applySettingsToDocument(applied);

  const flush = () => {
    timer = null;
    void saveSettings(store.getState().settings);
  };

  const schedule = () => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(flush, SETTINGS_SAVE_DEBOUNCE_MS);
  };

  const unsubscribe = store.subscribe(() => {
    const next = store.getState().settings;
    if (next === applied) return;

    applied = next;
    applySettingsToDocument(next);

    if (hydrating) return;
    schedule();
  });

  const replaceSettings = (settings: Settings) => {
    store.dispatch({ type: 'settings/replace', settings: { ...settings } });
  };

  Promise.resolve(platform.persist.loadSettings())
    .then((answer) => {
      if (disposed) return;

      const failure = loadFailure(answer);
      if (failure !== null) {
        notify(failure, 'error');
        replaceSettings(DEFAULT_SETTINGS);
        return;
      }

      replaceSettings(answer as Settings);
    })
    .catch((error: unknown) => {
      if (disposed) return;
      notify(`Settings could not be loaded: ${describeError(error)}`, 'error');
      replaceSettings(DEFAULT_SETTINGS);
    })
    .finally(() => {
      hydrating = false;
    });

  return () => {
    disposed = true;
    unsubscribe();
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };
}
