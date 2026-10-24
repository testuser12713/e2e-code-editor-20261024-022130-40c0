import { useState } from 'react';
import type { ReactNode } from 'react';

import type { Tab, TreeNode } from '../../state/types';
import { Button } from '../Button';
import { EmptyState } from '../EmptyState';
import { Icon, type IconName } from '../Icon';
import { IconButton } from '../IconButton';
import { ListBox } from '../ListBox';
import { NoticeView } from '../Notify';
import { StatusItem } from '../StatusItem';
import { TabChip } from '../TabChip';
import { TextField } from '../TextField';
import { Toggle } from '../Toggle';
import { Tooltip } from '../Tooltip';
import { TreeRow } from '../TreeRow';

const ICON_NAMES: IconName[] = [
  'brand',
  'folder',
  'folder-open',
  'file',
  'search',
  'settings',
  'refresh',
  'chevron',
  'chevron-down',
  'close',
  'command',
  'info',
  'save',
  'alert',
  'shield',
  'check',
  'trash',
  'edit',
  'new-file',
  'new-folder',
  'layout',
];

type CommandEntry = {
  id: string;
  label: string;
  detail: string;
  icon: IconName;
  shortcut?: string;
  disabled?: boolean;
};

const COMMANDS: CommandEntry[] = [
  {
    id: 'workspace.openFolder',
    label: 'Open Folder…',
    detail: 'Workspace',
    icon: 'folder-open',
    shortcut: 'Ctrl+Shift+O',
  },
  {
    id: 'file.save',
    label: 'Save Active File',
    detail: 'File',
    icon: 'save',
    shortcut: 'Ctrl+S',
  },
  {
    id: 'file.quickOpen',
    label: 'Quick Open',
    detail: 'Go',
    icon: 'search',
    shortcut: 'Ctrl+P',
  },
  {
    id: 'workspace.splitEditor',
    label: 'Split Editor',
    detail: 'View',
    icon: 'layout',
    disabled: true,
  },
];

type RecentEntry = {
  path: string;
  name: string;
};

const RECENT_FOLDERS: RecentEntry[] = [
  { name: 'forge-editor', path: 'C:\\Users\\Patrick\\Projects\\forge' },
  { name: 'atlas-api', path: 'C:\\Users\\Patrick\\Projects\\atlas-api' },
  { name: 'relay-site', path: 'D:\\studio\\relay-site' },
];

const TABS: Tab[] = [
  { id: 'tab-documents', relPath: 'src/state/documents.ts', name: 'documents.ts' },
  { id: 'tab-tabs-reducer', relPath: 'src/state/tabsReducer.ts', name: 'tabsReducer.ts' },
  { id: 'tab-readme', relPath: 'README.md', name: 'README.md' },
];

const SRC_DIR: TreeNode = { name: 'src', relPath: 'src', kind: 'dir' };
const STATE_DIR: TreeNode = { name: 'state', relPath: 'src/state', kind: 'dir' };
const DOCUMENTS_FILE: TreeNode = { name: 'documents.ts', relPath: 'src/state/documents.ts', kind: 'file' };
const HERO_FILE: TreeNode = { name: 'hero.png', relPath: 'assets/hero.png', kind: 'file' };
const LOG_FILE: TreeNode = { name: 'electron.log', relPath: 'logs/electron.log', kind: 'file' };

function Specimen({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <article className="kit-specimen" data-testid={id}>
      <header className="kit-specimen-head">
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className="kit-specimen-body">{children}</div>
    </article>
  );
}

function State({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="kit-state">
      {children}
      <span className="kit-state-label">{label}</span>
    </div>
  );
}

export function FoundationsSection() {
  const [toggles, setToggles] = useState({ off: false, on: true });
  const [selectedCommand, setSelectedCommand] = useState('workspace.openFolder');
  const [selectedFolder, setSelectedFolder] = useState('forge-editor');
  const [activeTab, setActiveTab] = useState('tab-documents');
  const [tabDirty, setTabDirty] = useState<Record<string, boolean>>({ 'tab-documents': true });
  const [noticeVisible, setNoticeVisible] = useState({ info: true, error: true });

  return (
    <section className="settings-section" aria-labelledby="gallery-foundations-title">
      <div>
        <h2 id="gallery-foundations-title">Foundations</h2>
        <p className="section-desc">Buttons, inputs, lists, tree rows and toasts.</p>
      </div>
      <div className="setting-list kit-gallery" data-testid="gallery-foundations">
        <Specimen
          id="kit-buttons"
          title="Button"
          description="Default, primary, ghost and danger variants at three sizes, with hover, focus, active and disabled states."
        >
          <div className="kit-state-grid">
            <State label="default">
              <Button data-testid="button-default-idle">Cancel</Button>
            </State>
            <State label="hover">
              <Button data-testid="button-default-hover" className="is-preview-hover">
                Cancel
              </Button>
            </State>
            <State label="focus">
              <Button data-testid="button-default-focus" className="is-preview-focus">
                Cancel
              </Button>
            </State>
            <State label="active">
              <Button data-testid="button-default-active" className="is-preview-active">
                Cancel
              </Button>
            </State>
            <State label="disabled">
              <Button data-testid="button-default-disabled" disabled>
                Cancel
              </Button>
            </State>
          </div>
          <div className="kit-state-grid">
            <State label="primary">
              <Button data-testid="button-primary-idle" variant="primary">
                Save
              </Button>
            </State>
            <State label="primary hover">
              <Button data-testid="button-primary-hover" variant="primary" className="is-preview-hover">
                Save
              </Button>
            </State>
            <State label="primary disabled">
              <Button data-testid="button-primary-disabled" variant="primary" disabled>
                Save
              </Button>
            </State>
            <State label="ghost">
              <Button data-testid="button-ghost-idle" variant="ghost">
                Skip
              </Button>
            </State>
            <State label="ghost hover">
              <Button data-testid="button-ghost-hover" variant="ghost" className="is-preview-hover">
                Skip
              </Button>
            </State>
            <State label="danger">
              <Button data-testid="button-danger-idle" variant="danger">
                Delete
              </Button>
            </State>
            <State label="danger hover">
              <Button data-testid="button-danger-hover" variant="danger" className="is-preview-hover">
                Delete
              </Button>
            </State>
          </div>
          <div className="kit-state-grid">
            <State label="small">
              <Button data-testid="button-size-sm" size="sm">
                <Icon name="folder-open" size="sm" />
                Open Folder…
              </Button>
            </State>
            <State label="medium">
              <Button data-testid="button-size-md">
                <Icon name="folder-open" size="sm" />
                Open Folder…
              </Button>
            </State>
            <State label="large">
              <Button data-testid="button-size-lg" variant="primary" size="lg">
                <Icon name="folder-open" />
                Open Folder…
              </Button>
            </State>
          </div>
        </Specimen>

        <Specimen
          id="kit-icon-buttons"
          title="Icon button"
          description="The compact action used in the sidebar, tab bar and notices."
        >
          <div className="kit-state-grid">
            <State label="idle">
              <IconButton label="Refresh explorer" data-testid="icon-button-idle">
                <Icon name="refresh" size="sm" />
              </IconButton>
            </State>
            <State label="hover">
              <IconButton
                label="Refresh explorer"
                data-testid="icon-button-hover"
                className="is-preview-hover"
              >
                <Icon name="refresh" size="sm" />
              </IconButton>
            </State>
            <State label="focus">
              <IconButton
                label="Refresh explorer"
                data-testid="icon-button-focus"
                className="is-preview-focus"
              >
                <Icon name="refresh" size="sm" />
              </IconButton>
            </State>
            <State label="disabled">
              <IconButton label="Refresh explorer" data-testid="icon-button-disabled" disabled>
                <Icon name="refresh" size="sm" />
              </IconButton>
            </State>
          </div>
        </Specimen>

        <Specimen
          id="kit-text-field"
          title="Text field"
          description="Labelled input with hint and error copy, the focused state and the disabled state."
        >
          <div className="kit-split">
            <TextField
              label="Name"
              placeholder="file.ts"
              hint="The operation is checked against the workspace root."
              testId="text-field-idle"
              autoComplete="off"
              spellCheck={false}
            />
            <TextField
              label="Name"
              defaultValue="documents.ts"
              className="is-preview-hover"
              testId="text-field-hover"
            />
            <TextField
              label="Name"
              defaultValue="documents.ts"
              className="is-preview-focus"
              testId="text-field-focus"
            />
            <TextField
              label="Name"
              defaultValue="documents.ts"
              error="A file named documents.ts already exists in src/state. Nothing was written to disk."
              testId="text-field-error"
            />
            <TextField
              label="Name"
              defaultValue="protected.ts"
              hint="This field is read-only while the file saves."
              disabled
              testId="text-field-disabled"
            />
            <TextField label="Folder" inputSize="lg" placeholder="src/state" testId="text-field-lg" />
          </div>
        </Specimen>

        <Specimen
          id="kit-toggle"
          title="Toggle"
          description="Boolean switch in off, on, focused and disabled states."
        >
          <div className="kit-state-grid">
            <State label="off">
              <Toggle
                label="Word wrap"
                checked={toggles.off}
                testId="toggle-off"
                onChange={(checked) => setToggles((current) => ({ ...current, off: checked }))}
              />
            </State>
            <State label="on">
              <Toggle
                label="Word wrap"
                checked={toggles.on}
                testId="toggle-on"
                onChange={(checked) => setToggles((current) => ({ ...current, on: checked }))}
              />
            </State>
            <State label="hover">
              <Toggle
                label="Word wrap"
                checked={toggles.on}
                className="is-preview-hover"
                testId="toggle-hover"
                onChange={() => undefined}
              />
            </State>
            <State label="focus">
              <Toggle
                label="Word wrap"
                checked
                className="is-preview-focus"
                testId="toggle-focus"
                onChange={() => undefined}
              />
            </State>
            <State label="disabled off">
              <Toggle label="Word wrap" checked={false} disabled testId="toggle-disabled-off" onChange={() => undefined} />
            </State>
            <State label="disabled on">
              <Toggle label="Word wrap" checked disabled testId="toggle-disabled-on" onChange={() => undefined} />
            </State>
          </div>
        </Specimen>

        <Specimen
          id="kit-listbox"
          title="List box"
          description="Palette rows with icon, detail and keybinding; a recent-folders list; and the empty result."
        >
          <ListBox<CommandEntry>
            items={COMMANDS}
            getKey={(item) => item.id}
            getLabel={(item) => item.label}
            getDetail={(item) => item.detail}
            getIcon={(item) => item.icon}
            getTrailing={(item) =>
              item.shortcut ? <span className="kbd">{item.shortcut}</span> : undefined
            }
            isDisabled={(item) => item.disabled === true}
            selectedKey={selectedCommand}
            onSelect={(item) => setSelectedCommand(item.id)}
            ariaLabel="Commands"
            testId="listbox-palette"
          />
          <ListBox<RecentEntry>
            variant="recent"
            items={RECENT_FOLDERS}
            getKey={(item) => item.path}
            getLabel={(item) => item.name}
            getDetail={(item) => item.path}
            getIcon={() => 'folder'}
            selectedKey={RECENT_FOLDERS.find((item) => item.name === selectedFolder)?.path ?? null}
            onSelect={(item) => setSelectedFolder(item.name)}
            ariaLabel="Open recent"
            testId="listbox-recent"
          />
          <ListBox<CommandEntry>
            items={[]}
            getKey={(item) => item.id}
            getLabel={(item) => item.label}
            onSelect={() => undefined}
            emptyMessage="No matching entries."
            testId="listbox-empty"
          />
        </Specimen>

        <Specimen
          id="kit-empty-state"
          title="Empty state"
          description="The editor pane and the sidebar both start with a short explanation and a way forward."
        >
          <div className="kit-empty-row">
            <EmptyState
              title="No file open"
              description="Select a file from the explorer to open it in the editor."
              icon="file"
              testId="empty-state-page"
            >
              <Button size="sm">
                <Icon name="folder-open" size="sm" />
                Open Folder…
              </Button>
            </EmptyState>
            <EmptyState
              variant="inline"
              title="Open a folder to build the workspace tree."
              description="Forge only reads inside that folder."
              testId="empty-state-inline"
            >
              <Button size="sm">
                <Icon name="folder-open" size="sm" />
                Open Folder…
              </Button>
            </EmptyState>
          </div>
        </Specimen>

        <Specimen
          id="kit-icons"
          title="Icon"
          description="The bundled sprite at small, medium and large sizes."
        >
          <div className="kit-state-grid">
            <State label="small">
              <Icon name="search" size="sm" testId="icon-sm" />
            </State>
            <State label="medium">
              <Icon name="search" testId="icon-md" />
            </State>
            <State label="large">
              <Icon name="search" size="lg" testId="icon-lg" />
            </State>
          </div>
          <div className="kit-state-grid">
            {ICON_NAMES.map((name) => (
              <span className="kit-icon-cell" key={name}>
                <Icon name={name} title={name} />
                <span>{name}</span>
              </span>
            ))}
          </div>
        </Specimen>

        <Specimen
          id="kit-tooltip"
          title="Tooltip"
          description="A short label that appears on hover and keyboard focus."
        >
          <div className="kit-inline">
            <Tooltip label="Refresh explorer" testId="tooltip-refresh">
              <IconButton label="Refresh explorer">
                <Icon name="refresh" size="sm" />
              </IconButton>
            </Tooltip>
            <Tooltip label="Close documents.ts" testId="tooltip-close">
              <IconButton label="Close documents.ts">
                <Icon name="close" size="sm" />
              </IconButton>
            </Tooltip>
            <Tooltip label="Open the command palette" className="is-preview-hover" testId="tooltip-open">
              <IconButton label="Open the command palette">
                <Icon name="command" size="sm" />
              </IconButton>
            </Tooltip>
          </div>
        </Specimen>

        <Specimen
          id="kit-tree-row"
          title="Tree row"
          description="Folder and file rows with expand, active and badge states."
        >
          <div className="kit-tree-frame" role="tree" aria-label="Workspace files">
            <TreeRow node={SRC_DIR} expanded={false} testId="tree-row-folder" />
            <TreeRow node={SRC_DIR} expanded testId="tree-row-folder-expanded" />
            <TreeRow node={STATE_DIR} depth={1} expanded testId="tree-row-folder-nested" />
            <TreeRow node={DOCUMENTS_FILE} depth={2} active testId="tree-row-file-active" />
            <TreeRow node={DOCUMENTS_FILE} depth={2} className="is-preview-hover" testId="tree-row-file-hover" />
            <TreeRow node={DOCUMENTS_FILE} depth={2} className="is-preview-focus" testId="tree-row-file-focus" />
            <TreeRow node={HERO_FILE} depth={2} badge="BIN" testId="tree-row-badge-bin" />
            <TreeRow node={LOG_FILE} depth={2} badge="4.8 MB" testId="tree-row-badge-size" />
          </div>
        </Specimen>

        <Specimen
          id="kit-tab-chip"
          title="Tab chip"
          description="Active, inactive and dirty tabs, each with its close control."
        >
          <div className="kit-tab-frame" role="tablist" aria-label="Open editors">
            {TABS.map((tab) => (
              <TabChip
                key={tab.id}
                tab={tab}
                active={tab.id === activeTab}
                dirty={Boolean(tabDirty[tab.id])}
                testId={`tab-chip-${tab.id}`}
                onSelect={(tabId) => setActiveTab(tabId)}
                onClose={(tabId) =>
                  setTabDirty((current) => {
                    const next = { ...current };
                    delete next[tabId];
                    return next;
                  })
                }
              />
            ))}
            <TabChip
              tab={{ id: 'tab-legacy', relPath: 'src/state/legacy.ts', name: 'legacy.ts' }}
              active={false}
              dirty={false}
              className="is-preview-hover"
              testId="tab-chip-hover"
              onSelect={() => undefined}
              onClose={() => undefined}
            />
            <TabChip
              tab={{ id: 'tab-platform', relPath: 'src/platform.ts', name: 'platform.ts' }}
              active={false}
              dirty={false}
              className="is-preview-focus"
              testId="tab-chip-focus"
              onSelect={() => undefined}
              onClose={() => undefined}
            />
          </div>
        </Specimen>

        <Specimen
          id="kit-status-item"
          title="Status item"
          description="Status bar cells, including the muted label and the strong welcome marker."
        >
          <div className="kit-status-frame">
            <StatusItem testId="status-item-welcome">
              <span className="accent-dot" />
              <strong>Welcome</strong>
            </StatusItem>
            <StatusItem testId="status-item-muted">No active document</StatusItem>
            <StatusItem testId="status-item-mono">Spaces: 2</StatusItem>
            <StatusItem title="Encoding" testId="status-item-titled">
              UTF-8
            </StatusItem>
          </div>
        </Specimen>

        <Specimen
          id="kit-notice"
          title="Notice"
          description="The info notice and the error variant that names a rejected file."
        >
          <div className="kit-notice-frame">
            {noticeVisible.info ? (
              <NoticeView
                kind="info"
                title="Workspace opened"
                message="forge-editor is ready. File access stays inside that folder."
                testId="notice-info"
                onDismiss={() => setNoticeVisible((current) => ({ ...current, info: false }))}
              />
            ) : (
              <Button
                size="sm"
                variant="ghost"
                data-testid="notice-info-restore"
                onClick={() => setNoticeVisible((current) => ({ ...current, info: true }))}
              >
                Restore info notice
              </Button>
            )}
            {noticeVisible.error ? (
              <NoticeView
                kind="error"
                title="hero.png can’t be opened"
                message="Binary files are not supported in the text editor. No tab was created."
                testId="notice-error"
                onDismiss={() => setNoticeVisible((current) => ({ ...current, error: false }))}
              />
            ) : (
              <Button
                size="sm"
                variant="ghost"
                data-testid="notice-error-restore"
                onClick={() => setNoticeVisible((current) => ({ ...current, error: true }))}
              >
                Restore error notice
              </Button>
            )}
          </div>
        </Specimen>
      </div>
    </section>
  );
}
