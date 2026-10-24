import type { Settings } from './types';

export type SettingsAction =
  | { type: 'settings/update'; patch: Partial<Settings> }
  | { type: 'settings/replace'; settings: Settings };

export function settingsReducer(state: Settings, action: SettingsAction): Settings {
  void action;
  return state;
}
