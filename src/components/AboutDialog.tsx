import { COMMAND_IDS } from '../commands/ids';
import { hasCommand, runCommand } from '../commands/registry';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';

export type AboutDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function AboutDialog({ open, onClose }: AboutDialogProps) {
  if (!open) return null;

  return (
    <div className="about-backdrop" data-od-id="about-overlay" data-testid="about-dialog">
      <section className="about-dialog" role="dialog" aria-modal="true" aria-labelledby="about-title">
        <div className="about-head">
          <div className="about-id">
            <span className="brand-mark">
              <Icon name="brand" />
            </span>
            <div>
              <h1 id="about-title">Forge</h1>
              <p>Local-first code editor for Windows · About / Privacy</p>
            </div>
          </div>
          <button type="button" className="icon-btn" title="Close About / Privacy" aria-label="Close About / Privacy" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>

        <div className="about-body">
          <p className="about-lede">
            Forge works only inside the folder you open. Everything else — preferences, session and recent
            folders — stays in a local userData directory. There is no account, no sync and no telemetry.
          </p>

          <section className="about-section" aria-labelledby="stored-title">
            <h2 id="stored-title">Stored on this device</h2>
            <ul className="about-list">
              <li>
                <Icon name="check" size="sm" />
                <span><strong>Recent folders</strong> — up to five absolute folder paths.</span>
              </li>
              <li>
                <Icon name="check" size="sm" />
                <span><strong>Session</strong> — the workspace root, open tab paths and cursor positions, saved in tab order.</span>
              </li>
              <li>
                <Icon name="check" size="sm" />
                <span><strong>Settings</strong> — theme, editor and tree font size, tab size, word wrap and whitespace visibility.</span>
              </li>
            </ul>
            <div className="about-note">
              <strong>Location</strong><br />
              The operating system’s userData directory for this account. Settings, session and recent folders
              are separate JSON files. File contents are never persisted.
            </div>
          </section>

          <section className="about-section" aria-labelledby="network-title">
            <h2 id="network-title">Nothing leaves this machine</h2>
            <p className="about-lede">
              Monaco, fonts and icons are bundled with the application. While Forge runs, it makes no HTTP or
              HTTPS request. External links are refused in the renderer; only a checked http(s) link can be
              passed to the operating system’s browser.
            </p>
          </section>

          <section className="about-section" aria-labelledby="delete-title">
            <h2 id="delete-title">Deleting local data</h2>
            <p className="about-lede">
              Reset Local Data removes <span className="mono">settings.json</span>,{' '}
              <span className="mono">session.json</span> and <span className="mono">recent-folders.json</span>.
              Forge restarts at the Welcome screen with defaults. This cannot be undone.
            </p>
          </section>

          <section className="about-section" aria-labelledby="vendor-title">
            <h2 id="vendor-title">Vendor details</h2>
            <p className="about-pending">
              <span className="badge badge-accent">Open</span> Provider name, contact address and legal notice
              are still to be supplied by the vendor. These fields are intentionally not invented.
            </p>
          </section>
        </div>

        <div className="about-actions">
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
          <Button onClick={onClose}>Close</Button>
        </div>
      </section>
    </div>
  );
}
