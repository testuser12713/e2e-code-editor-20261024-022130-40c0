import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { Icon } from '../ui/Icon';

export type ClosePromptDialogProps = {
  open: boolean;
  fileName?: string;
  relPath?: string;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
};

function baseName(relPath: string): string {
  const normalized = relPath.replace(/\\/g, '/');
  return normalized.split('/').pop() || normalized;
}

export function ClosePromptDialog({
  open,
  fileName,
  relPath,
  onSave,
  onDiscard,
  onCancel,
}: ClosePromptDialogProps) {
  const name = fileName ?? (relPath ? baseName(relPath) : undefined);

  return (
    <Dialog
      open={open}
      role="alertdialog"
      title="Save changes before closing?"
      subtitle={name ? `${name} · unsaved` : 'Unsaved changes'}
      icon="alert"
      iconTone="accent"
      description={
        <>
          <strong>{relPath ?? fileName ?? 'This file'}</strong> has unsaved changes. If Forge closes now,
          those changes are lost. Cancel leaves the tab and the window exactly as they are.
        </>
      }
      testId="close-prompt"
      footer={
        <>
          <span className="dialog-meta">Ctrl+S saves without closing</span>
          <Button variant="primary" testId="close-prompt-save" onClick={onSave}>
            <Icon name="save" size="sm" />
            Save
          </Button>
          <Button testId="close-prompt-discard" onClick={onDiscard}>
            Don’t Save
          </Button>
          <Button testId="close-prompt-cancel" onClick={onCancel}>
            Cancel
          </Button>
        </>
      }
    />
  );
}
