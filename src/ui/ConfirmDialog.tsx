import type { ReactNode } from 'react';

import { Button } from './Button';
import { Dialog } from './Dialog';
import type { IconName } from './Icon';

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  meta?: string;
  tone?: 'default' | 'danger';
  icon?: IconName;
  onConfirm: () => void;
  onCancel: () => void;
  testId?: string;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  meta,
  tone = 'default',
  icon = 'alert',
  onConfirm,
  onCancel,
  testId,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      role="alertdialog"
      title={title}
      description={description}
      icon={icon}
      iconTone={tone === 'danger' ? 'danger' : 'accent'}
      onClose={onCancel}
      testId={testId}
      footer={
        <>
          {meta ? <span className="dialog-meta">{meta}</span> : null}
          <Button onClick={onCancel}>{cancelLabel}</Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}
