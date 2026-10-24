import { useState } from 'react';
import type { ReactNode } from 'react';

import { Button } from '../Button';
import { ConfirmDialog } from '../ConfirmDialog';
import { ContextMenu } from '../ContextMenu';
import { Dialog } from '../Dialog';
import { Icon } from '../Icon';
import { Menu, type MenuEntry } from '../Menu';
import { PromptDialog } from '../PromptDialog';
import { Specimen, State } from './GallerySpecimen';

const FILE_MENU_ITEMS: MenuEntry[] = [
  { label: 'Open Folder…', keybinding: 'Ctrl+Shift+O', icon: 'folder-open', onSelect: () => undefined },
  { label: 'Open Recent', disabled: true },
  { separator: true },
  { label: 'Save', keybinding: 'Ctrl+S', icon: 'save', onSelect: () => undefined },
  { label: 'Save All', keybinding: 'Ctrl+Alt+S', icon: 'save', onSelect: () => undefined },
  { label: 'Close Tab', icon: 'close', onSelect: () => undefined },
  { separator: true },
  { label: 'Settings', keybinding: 'Ctrl+,', icon: 'settings', onSelect: () => undefined },
  { label: 'Reset Local Data', icon: 'trash', danger: true, onSelect: () => undefined },
];

const OPEN_MENU_ITEMS: MenuEntry[] = FILE_MENU_ITEMS.map((entry) => {
  if ('separator' in entry) return entry;
  if (entry.label === 'Open Recent') return { ...entry, testId: 'menu-item-disabled' };
  if (entry.label === 'Save') return { ...entry, preview: 'hover', testId: 'menu-item-hover' };
  if (entry.label === 'Save All') return { ...entry, preview: 'focus', testId: 'menu-item-focus' };
  if (entry.label === 'Reset Local Data') return { ...entry, testId: 'menu-item-danger' };
  return entry;
});

const CONTEXT_MENU_ITEMS: MenuEntry[] = [
  { label: 'New File…', icon: 'new-file', onSelect: () => undefined, testId: 'context-menu-item-new-file' },
  { label: 'New Folder…', icon: 'new-folder', onSelect: () => undefined },
  { separator: true },
  { label: 'Rename', icon: 'edit', onSelect: () => undefined, testId: 'context-menu-item-rename', preview: 'hover' },
  { label: 'Delete', icon: 'trash', danger: true, onSelect: () => undefined, testId: 'context-menu-item-delete' },
];

function PromptSpecimen({
  id,
  title,
  subtitle,
  label,
  initialValue,
  placeholder,
  hint,
  meta,
  error,
  confirmLabel,
  inputClassName,
}: {
  id: string;
  title: string;
  subtitle?: string;
  label: string;
  initialValue: string;
  placeholder?: string;
  hint?: string;
  meta?: string;
  error?: string;
  confirmLabel?: string;
  inputClassName?: string;
}) {
  const [value, setValue] = useState(initialValue);
  const [visible, setVisible] = useState(true);

  return (
    <div className="kit-overlay-frame">
      {visible ? (
        <PromptDialog
          open
          contained
          autoFocus={false}
          title={title}
          subtitle={subtitle}
          label={label}
          value={value}
          placeholder={placeholder}
          hint={hint}
          meta={meta}
          error={error}
          confirmLabel={confirmLabel}
          inputClassName={inputClassName}
          inputTestId={`${id}-input`}
          testId={id}
          onValueChange={setValue}
          onConfirm={() => setVisible(false)}
          onCancel={() => setVisible(false)}
        />
      ) : (
        <div className="kit-overlay-restore">
          <Button size="sm" variant="ghost" testId={`${id}-restore`} onClick={() => setVisible(true)}>
            Restore {title}
          </Button>
        </div>
      )}
    </div>
  );
}

function ConfirmSpecimen({
  id,
  ...props
}: {
  id: string;
  title: string;
  subtitle?: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  meta?: string;
  tone?: 'default' | 'danger';
  icon?: 'alert' | 'trash';
}) {
  const [visible, setVisible] = useState(true);

  return (
    <div className="kit-overlay-frame">
      {visible ? (
        <ConfirmDialog
          open
          contained
          {...props}
          testId={id}
          onConfirm={() => setVisible(false)}
          onCancel={() => setVisible(false)}
        />
      ) : (
        <div className="kit-overlay-restore">
          <Button size="sm" variant="ghost" testId={`${id}-restore`} onClick={() => setVisible(true)}>
            Restore {props.title}
          </Button>
        </div>
      )}
    </div>
  );
}

export function OverlaysSection() {
  const [containedDialogOpen, setContainedDialogOpen] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(true);

  return (
    <section className="settings-section" aria-labelledby="gallery-overlays-title">
      <div>
        <h2 id="gallery-overlays-title">Overlays</h2>
        <p className="section-desc">Menus, context menus and the dialog family.</p>
      </div>
      <div className="setting-list kit-gallery" data-testid="gallery-overlays">
        <Specimen
          id="kit-menu"
          title="Menu"
          description="The title bar menu trigger, closed and open, with a hovered item, a focused item and a disabled entry."
        >
          <div className="kit-overlay-grid">
            <State label="closed">
              <Menu label="File" items={FILE_MENU_ITEMS} testId="menu-closed-trigger" menuTestId="menu-closed" />
            </State>
            <State label="open">
              <Menu
                label="File"
                items={OPEN_MENU_ITEMS}
                testId="menu-open-trigger"
                menuTestId="menu-open"
                defaultOpen
                inline
              />
            </State>
          </div>
        </Specimen>

        <Specimen
          id="kit-context-menu"
          title="Context menu"
          description="The explorer context menu, with a hovered row, a separator and the destructive Delete action."
        >
          {contextOpen ? (
            <div className="kit-overlay-frame">
              <ContextMenu
                x={0}
                y={0}
                inline
                label="File actions for legacy.ts"
                items={CONTEXT_MENU_ITEMS}
                testId="context-menu"
                onClose={() => setContextOpen(false)}
              />
            </div>
          ) : (
            <div className="kit-overlay-frame">
              <div className="kit-overlay-restore">
                <Button
                  size="sm"
                  variant="ghost"
                  testId="context-menu-restore"
                  onClick={() => setContextOpen(true)}
                >
                  Restore context menu
                </Button>
              </div>
            </div>
          )}
        </Specimen>

        <Specimen
          id="kit-dialog"
          title="Dialog"
          description="The base dialog used by the close prompt, and the same dialog opened over the application."
        >
          <div className="kit-overlay-grid">
            <State label="open, contained">
              <div className="kit-overlay-frame">
                {containedDialogOpen ? (
                  <Dialog
                    open
                    contained
                    role="alertdialog"
                    title="Save changes before closing?"
                    subtitle="documents.ts · unsaved"
                    icon="alert"
                    iconTone="accent"
                    description={
                      <>
                        <strong>src/state/documents.ts</strong> has unsaved changes. If Forge closes now,
                        those changes are lost. Cancel leaves the tab and the window exactly as they are.
                      </>
                    }
                    testId="dialog-contained"
                    onClose={() => setContainedDialogOpen(false)}
                    footer={
                      <>
                        <span className="dialog-meta">Ctrl+S saves without closing</span>
                        <Button
                          variant="primary"
                          data-testid="dialog-contained-save"
                          onClick={() => setContainedDialogOpen(false)}
                        >
                          <Icon name="save" size="sm" />
                          Save
                        </Button>
                        <Button onClick={() => setContainedDialogOpen(false)}>Don’t Save</Button>
                        <Button onClick={() => setContainedDialogOpen(false)}>Cancel</Button>
                      </>
                    }
                  />
                ) : (
                  <div className="kit-overlay-restore">
                    <Button
                      size="sm"
                      variant="ghost"
                      testId="dialog-contained-restore"
                      onClick={() => setContainedDialogOpen(true)}
                    >
                      Restore dialog
                    </Button>
                  </div>
                )}
              </div>
            </State>
            <State label={dialogOpen ? 'open' : 'closed'}>
              <div className="kit-overlay-frame">
                <Button
                  variant="primary"
                  size="sm"
                  testId="dialog-open-button"
                  onClick={() => setDialogOpen(true)}
                >
                  Open dialog
                </Button>
              </div>
            </State>
          </div>
          {dialogOpen ? (
            <Dialog
              open
              role="alertdialog"
              title="Save changes before closing?"
              subtitle="documents.ts · unsaved"
              icon="alert"
              iconTone="accent"
              description={
                <>
                  <strong>src/state/documents.ts</strong> has unsaved changes. If Forge closes now,
                  those changes are lost. Cancel leaves the tab and the window exactly as they are.
                </>
              }
              testId="dialog-modal"
              onClose={() => setDialogOpen(false)}
              footer={
                <>
                  <span className="dialog-meta">Ctrl+S saves without closing</span>
                  <Button variant="primary" onClick={() => setDialogOpen(false)}>
                    <Icon name="save" size="sm" />
                    Save
                  </Button>
                  <Button onClick={() => setDialogOpen(false)}>Don’t Save</Button>
                  <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                </>
              }
            />
          ) : null}
        </Specimen>

        <Specimen
          id="kit-confirm-dialog"
          title="Confirm dialog"
          description="The accent confirmation and the danger confirmation used before deleting a file."
        >
          <div className="kit-overlay-grid">
            <ConfirmSpecimen
              id="confirm-dialog-default"
              title="Discard unsaved changes?"
              subtitle="3 tabs"
              description="The tabs with unsaved edits will be closed and their changes discarded. This action cannot be undone."
              confirmLabel="Discard"
              meta="Checked against the workspace root"
            />
            <ConfirmSpecimen
              id="confirm-dialog-danger"
              title="Delete legacy.ts?"
              subtitle="src/state/legacy.ts"
              description="Forge will remove this file from the workspace and close its open tab, discarding the unsaved changes marked on that tab. This action cannot be undone."
              confirmLabel="Delete"
              tone="danger"
              icon="trash"
              meta="Path checked inside forge-editor"
            />
          </div>
        </Specimen>

        <Specimen
          id="kit-prompt-dialog"
          title="Prompt dialog"
          description="The name prompt in its idle, focused and validation states."
        >
          <div className="kit-overlay-grid">
            <PromptSpecimen
              id="prompt-dialog-idle"
              title="New File"
              subtitle="Inside src/state"
              label="Name"
              initialValue=""
              placeholder="file.ts"
              meta="The operation is checked against the workspace root."
            />
            <PromptSpecimen
              id="prompt-dialog-focused"
              title="Rename"
              subtitle="src/state/legacy.ts"
              label="New name"
              initialValue="legacy.ts"
              inputClassName="is-preview-focus"
              meta="The name is checked against the workspace root."
            />
            <PromptSpecimen
              id="prompt-dialog-error"
              title="New File"
              subtitle="Inside src/state"
              label="Name"
              initialValue="documents.ts"
              error="A file named documents.ts already exists in src/state. Nothing was written to disk."
            />
          </div>
        </Specimen>
      </div>
    </section>
  );
}
