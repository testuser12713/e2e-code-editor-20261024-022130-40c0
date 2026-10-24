import { useEffect, useState } from 'react';

import { COMMAND_IDS } from '../commands/ids';
import { hasCommand, runCommand } from '../commands/registry';
import { platform } from '../platform';
import {
  resetLocalData,
  setPrivacyDialogHandler,
  type PrivacyDialogRequest,
} from '../privacy/privacyCommands';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Icon } from '../ui/Icon';

const FILESYSTEM_PATH = /^(?:[a-zA-Z]:[\\/]|\\\\|\/)/;

function isFilesystemPath(value: string): boolean {
  return FILESYSTEM_PATH.test(value);
}

export type AboutDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function AboutDialog({ open, onClose }: AboutDialogProps) {
  const [requestedOpen, setRequestedOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [userDataPath, setUserDataPath] = useState<string | null>(null);
  const [pathUnavailable, setPathUnavailable] = useState(false);

  const isOpen = open || requestedOpen;

  useEffect(() => {
    const handleRequest = (request: PrivacyDialogRequest) => {
      if (request === 'about') {
        setRequestedOpen(true);
        setResetOpen(false);
        return;
      }
      setResetOpen(true);
    };

    setPrivacyDialogHandler(handleRequest);
    return () => setPrivacyDialogHandler(null);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    setPathUnavailable(false);
    platform.persist
      .userDataPath()
      .then((path) => {
        if (!active) return;
        const value = typeof path === 'string' ? path.trim() : '';
        setUserDataPath(value.length > 0 ? value : null);
        setPathUnavailable(value.length === 0);
      })
      .catch(() => {
        if (!active) return;
        setUserDataPath(null);
        setPathUnavailable(true);
      });

    return () => {
      active = false;
    };
  }, [isOpen]);

  const close = () => {
    setRequestedOpen(false);
    setResetOpen(false);
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || resetOpen) return;
      event.preventDefault();
      close();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, resetOpen]);

  const confirmReset = async () => {
    const reset = await resetLocalData();
    if (!reset) return;
    setResetOpen(false);
    setRequestedOpen(false);
    onClose();
  };

  const locationPath = typeof userDataPath === 'string' ? userDataPath.trim() : '';
  const hasFilesystemPath = isFilesystemPath(locationPath);
  const readingPath = userDataPath === null && !pathUnavailable;

  return (
    <>
      {isOpen ? (
        <div
          className="about-backdrop"
          data-od-id="about-overlay"
          data-testid="about-dialog"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <section
            className="about-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="about-title"
            style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          >
            <div className="about-head" style={{ flexShrink: 0 }}>
              <div className="about-id">
                <span className="brand-mark">
                  <Icon name="brand" />
                </span>
                <div>
                  <h1 id="about-title">Forge</h1>
                  <p>Local-first code editor for Windows · About / Privacy</p>
                </div>
              </div>
              <button
                type="button"
                className="icon-btn"
                title="Close About / Privacy"
                aria-label="Close About / Privacy"
                onClick={close}
              >
                <Icon name="close" />
              </button>
            </div>

            <div
              className="about-body"
              style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto' }}
            >
              <p className="about-lede">
                Forge works only inside the folder you open. Everything else — preferences, session and recent
                folders — stays in a local userData directory. There is no account, no sync and no telemetry.
              </p>

              <section className="about-section" aria-labelledby="stored-title">
                <h2 id="stored-title">Stored on this device</h2>
                <ul className="about-list">
                  <li>
                    <Icon name="check" size="sm" />
                    <span>
                      <strong>Recent folders</strong> — up to five absolute folder paths.
                    </span>
                  </li>
                  <li>
                    <Icon name="check" size="sm" />
                    <span>
                      <strong>Session</strong> — the workspace root, open tab paths and cursor positions, saved
                      in tab order.
                    </span>
                  </li>
                  <li>
                    <Icon name="check" size="sm" />
                    <span>
                      <strong>Settings</strong> — theme, editor and tree font size, tab size, word wrap and
                      whitespace visibility.
                    </span>
                  </li>
                </ul>
                <div className="about-note">
                  <strong>Location</strong>
                  <br />
                  {hasFilesystemPath ? (
                    <>
                      The operating system’s userData directory for this account:{' '}
                      <span className="about-path" data-testid="about-user-data-path">
                        {locationPath}
                      </span>
                    </>
                  ) : (
                    <span data-testid="about-user-data-path">
                      {pathUnavailable
                        ? 'Forge could not read the operating system’s userData directory for this account.'
                        : readingPath
                          ? 'Reading the operating system’s userData directory for this account…'
                          : 'In this browser preview there is no userData directory; settings, session and recent folders are kept in this browser’s local storage for this site.'}
                    </span>
                  )}
                  <br />
                  {hasFilesystemPath
                    ? 'Settings, session and recent folders are separate JSON files. File contents are never persisted.'
                    : 'Settings, session and recent folders are stored separately. File contents are never persisted.'}
                </div>
              </section>

              <section className="about-section" aria-labelledby="network-title">
                <h2 id="network-title">Nothing leaves this machine</h2>
                <p className="about-lede">
                  Monaco, fonts and icons are bundled with the application. While Forge runs, it makes no HTTP
                  or HTTPS request. External links are refused in the renderer; only a checked http(s) link can
                  be passed to the operating system’s browser.
                </p>
              </section>

              <section className="about-section" aria-labelledby="delete-title">
                <h2 id="delete-title">Deleting local data</h2>
                <p className="about-lede">
                  Reset Local Data removes <span className="mono">settings.json</span>,{' '}
                  <span className="mono">session.json</span> and{' '}
                  <span className="mono">recent-folders.json</span>. Forge restarts at the Welcome screen with
                  defaults. This cannot be undone.
                </p>
              </section>

              <section className="about-section" aria-labelledby="vendor-title">
                <h2 id="vendor-title">Vendor details</h2>
                <p className="about-pending">
                  <span className="badge badge-accent">Open</span> Provider name, contact address and legal
                  notice are still to be supplied by the vendor. These fields are intentionally not invented.
                </p>
              </section>
            </div>

            <div className="about-actions" style={{ flexShrink: 0 }}>
              <Button
                variant="danger"
                disabled={!hasCommand(COMMAND_IDS.resetLocalData)}
                onClick={() => {
                  void runCommand(COMMAND_IDS.resetLocalData);
                }}
              >
                <Icon name="trash" size="sm" />
                Reset Local Data
              </Button>
              <Button onClick={close}>Close</Button>
            </div>
          </section>
        </div>
      ) : null}

      <ConfirmDialog
        open={resetOpen}
        title="Reset local data?"
        subtitle="Settings · session · recent folders"
        description="Forge will delete all three JSON files from userData. Open tabs, recent folders and every preference return to defaults, and the app restarts at Welcome."
        confirmLabel="Reset Local Data"
        meta="File contents are not affected"
        tone="danger"
        icon="shield"
        testId="reset-local-data-dialog"
        onConfirm={() => {
          void confirmReset();
        }}
        onCancel={() => setResetOpen(false)}
      />
    </>
  );
}
