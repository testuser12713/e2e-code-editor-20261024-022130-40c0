import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';

export type ClosePromptDialogProps = {
  open: boolean;
  fileName?: string;
  relPath?: string;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
};

export function ClosePromptDialog({
  open,
  fileName,
  relPath,
  onSave,
  onDiscard,
  onCancel,
}: ClosePromptDialogProps) {
  return (
    <Dialog
      open={open}
      role="alertdialog"
      title="Save changes before closing?"
      icon="alert"
      iconTone="accent"
      description={
        <>
          <strong>{relPath ?? fileName ?? 'This file'}</strong> has unsaved changes. If Forge closes now,
          those changes are lost. Cancel leaves the tab and the window exactly as they are.
        </>
      }
      onClose={onCancel}
      testId="close-prompt"
      footer={
        <>
          <span className="dialog-meta">Ctrl+S saves without closing</span>
          <Button variant="primary" onClick={onSave}>
            Save
          </Button>
          <Button onClick={onDiscard}>Don’t Save</Button>
          <Button onClick={onCancel}>Cancel</Button>
        </>
      }
    />
  );
}
