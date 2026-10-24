import type { Settings } from './types';

export type SettingsAction =
  | { type: 'settings/update'; patch: Partial<Settings> }
  | { type: 'settings/replace'; settings: Settings };

export function settingsReducer(state: Settings, action: SettingsAction): Settings {
  switch (action.type) {
    case 'settings/update': {
      const next: Settings = { ...state, ...action.patch };
      const unchanged = (Object.keys(next) as (keyof Settings)[]).every(
        (key) => next[key] === state[key],
      );
      return unchanged ? state : next;
    }
    case 'settings/replace':
      return { ...action.settings };
    default:
      return state;
  }
}
