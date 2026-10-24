import { useEffect, useState } from 'react';

import { COMMAND_IDS } from '../commands/ids';
import { hasCommand, runCommand } from '../commands/registry';
import { platform } from '../platform';
import { appStore, useAppStore } from '../state/store';
import type { Settings } from '../state/types';
import { Icon } from '../ui/Icon';
import { Toggle } from '../ui/Toggle';
import './SettingsView.css';

const THEMES = ['dark', 'light'] as const;
const TAB_SIZES: Settings['tabSize'][] = [2, 4, 8];
const FONT_SIZE_MIN = 10;
const FONT_SIZE_MAX = 24;
const TREE_FONT_SIZE_MIN = 10;
const TREE_FONT_SIZE_MAX = 18;

const THEME_LABELS: Record<Settings['theme'], string> = {
  dark: 'Dark',
  light: 'Light',
};

function updateSettings(patch: Partial<Settings>): void {
  appStore.dispatch({ type: 'settings/update', patch });
}

export function SettingsView() {
  const state = useAppStore();
  const settings = state.settings;
  const [userDataPath, setUserDataPath] = useState<string | null>(null);
  const canOpenAbout = hasCommand(COMMAND_IDS.about);

  useEffect(() => {
    let active = true;

    void platform.persist
      .userDataPath()
      .then((path) => {
        if (!active) return;
        setUserDataPath(typeof path === 'string' && path.trim().length > 0 ? path : null);
      })
      .catch(() => {
        if (active) setUserDataPath(null);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="settings-wrap" data-testid="view-settings">
      <div className="settings-page">
        <header className="settings-header">
          <span className="eyebrow">Local preferences</span>
          <h1>Settings</h1>
          <p>
            These values belong to this machine. Changes take effect immediately in the editor and
            survive the next launch.
          </p>
          <span className="save-note">
            <span className="dot" />
            <span data-save-state>Saved locally</span> · userData/settings.json
          </span>
        </header>

        <section className="settings-section" aria-labelledby="appearance-title">
          <div>
            <h2 id="appearance-title">Appearance</h2>
            <p className="section-desc">
              The surface and the reading sizes. Light mode keeps the same contrast relationships as
              dark.
            </p>
          </div>
          <div className="setting-list">
            <div className="setting-row">
              <div>
                <span className="setting-label" id="theme-label">
                  Theme
                </span>
                <span className="setting-desc">
                  Applied to the editor chrome, panels and status bar.
                </span>
              </div>
              <div className="setting-control">
                <div className="segmented" role="group" aria-labelledby="theme-label">
                  {THEMES.map((theme) => (
                    <label key={theme}>
                      <input
                        type="radio"
                        name="theme"
                        value={theme}
                        data-setting="theme"
                        data-testid={`setting-theme-${theme}`}
                        checked={settings.theme === theme}
                        onChange={() => updateSettings({ theme })}
                      />
                      <span>{THEME_LABELS[theme]}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="setting-row">
              <div>
                <label className="setting-label" htmlFor="font-size">
                  Editor font size
                </label>
                <span className="setting-desc">
                  From 10 to 24 pixels; code, gutters and find results follow.
                </span>
              </div>
              <div className="setting-control">
                <div className="range-wrap">
                  <input
                    className="range"
                    id="font-size"
                    type="range"
                    min={FONT_SIZE_MIN}
                    max={FONT_SIZE_MAX}
                    step={1}
                    value={settings.fontSize}
                    data-setting="fontSize"
                    data-testid="setting-font-size"
                    onChange={(event) =>
                      updateSettings({ fontSize: Number(event.currentTarget.value) })
                    }
                  />
                  <output className="range-value" htmlFor="font-size" data-output-for="fontSize">
                    {settings.fontSize}
                  </output>
                </div>
              </div>
            </div>

            <div className="setting-row">
              <div>
                <label className="setting-label" htmlFor="tree-size">
                  File tree font size
                </label>
                <span className="setting-desc">
                  The explorer uses its own scale so long names stay readable.
                </span>
              </div>
              <div className="setting-control">
                <div className="range-wrap">
                  <input
                    className="range"
                    id="tree-size"
                    type="range"
                    min={TREE_FONT_SIZE_MIN}
                    max={TREE_FONT_SIZE_MAX}
                    step={1}
                    value={settings.treeFontSize}
                    data-setting="treeFontSize"
                    data-testid="setting-tree-font-size"
                    onChange={(event) =>
                      updateSettings({ treeFontSize: Number(event.currentTarget.value) })
                    }
                  />
                  <output className="range-value" htmlFor="tree-size" data-output-for="treeFontSize">
                    {settings.treeFontSize}
                  </output>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="settings-section" aria-labelledby="editor-title">
          <div>
            <h2 id="editor-title">Editor</h2>
            <p className="section-desc">
              How a document is drawn. These are editor defaults, not language settings.
            </p>
          </div>
          <div className="setting-list">
            <div className="setting-row">
              <div>
                <span className="setting-label" id="tabsize-label">
                  Tab size
                </span>
                <span className="setting-desc">
                  Used for indentation guides and when the Tab key inserts spaces.
                </span>
              </div>
              <div className="setting-control">
                <div className="segmented" role="group" aria-labelledby="tabsize-label">
                  {TAB_SIZES.map((tabSize) => (
                    <label key={tabSize}>
                      <input
                        type="radio"
                        name="tabSize"
                        value={tabSize}
                        data-setting="tabSize"
                        data-testid={`setting-tab-size-${tabSize}`}
                        checked={settings.tabSize === tabSize}
                        onChange={() => updateSettings({ tabSize })}
                      />
                      <span>{tabSize}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="setting-row">
              <div>
                <label className="setting-label" htmlFor="word-wrap">
                  Word wrap
                </label>
                <span className="setting-desc">
                  Long lines fold at the viewport instead of scrolling sideways.
                </span>
              </div>
              <div className="setting-control">
                <Toggle
                  id="word-wrap"
                  label="Word wrap"
                  testId="setting-word-wrap"
                  checked={settings.wordWrap}
                  onChange={(checked) => updateSettings({ wordWrap: checked })}
                />
              </div>
            </div>

            <div className="setting-row">
              <div>
                <label className="setting-label" htmlFor="show-whitespace">
                  Show whitespace
                </label>
                <span className="setting-desc">Reveals spaces and tabs with quiet marks.</span>
              </div>
              <div className="setting-control">
                <Toggle
                  id="show-whitespace"
                  label="Show whitespace"
                  testId="setting-show-whitespace"
                  checked={settings.renderWhitespace}
                  onChange={(checked) => updateSettings({ renderWhitespace: checked })}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="settings-section" aria-labelledby="storage-title">
          <div>
            <h2 id="storage-title">Storage</h2>
            <p className="section-desc">
              Settings, session and recent folders are separate local JSON files.
            </p>
          </div>
          <div>
            <div className="settings-path">
              <Icon name="info" size="sm" />
              <span>
                Changes are written atomically to the operating system’s userData directory.
                <code data-testid="settings-user-data-path">
                  {userDataPath ?? 'Path available in the desktop application'}
                </code>
                The stored fields and the reset action live in{' '}
                <button
                  type="button"
                  className="link-accent settings-link"
                  disabled={!canOpenAbout}
                  title={canOpenAbout ? undefined : 'The About / Privacy dialog is not available yet.'}
                  onClick={() => {
                    void runCommand(COMMAND_IDS.about);
                  }}
                >
                  About / Privacy
                </button>
                .
              </span>
            </div>
            <div className="settings-path">
              <Icon name="check" size="sm" />
              <span>
                Theme, font size, tab size, word wrap, whitespace and file tree size are restored on
                launch. No file contents or telemetry are kept.
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
