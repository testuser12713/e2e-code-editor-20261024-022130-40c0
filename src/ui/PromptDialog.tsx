import { useId } from 'react';

import { Button } from './Button';
import { Dialog } from './Dialog';
import type { IconName } from './Icon';

export type PromptDialogProps = {
  open: boolean;
  title: string;
  label: string;
  hint?: string;
  placeholder?: string;
  value: string;
  error?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  meta?: string;
  icon?: IconName;
  onValueChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  testId?: string;
};

export function PromptDialog({
  open,
  title,
  label,
  hint,
  placeholder,
  value,
  error,
  confirmLabel = 'Create',
  cancelLabel = 'Cancel',
  meta,
  icon = 'new-file',
  onValueChange,
  onConfirm,
  onCancel,
  testId,
}: PromptDialogProps) {
  const inputId = useId();

  return (
    <Dialog
      open={open}
      title={title}
      icon={icon}
      iconTone="accent"
      onClose={onCancel}
      testId={testId}
      footer={
        <>
          {meta ? <span className="dialog-meta">{meta}</span> : null}
          <Button onClick={onCancel}>{cancelLabel}</Button>
          <Button variant="primary" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="field">
        <label className="label" htmlFor={inputId}>
          {label}
        </label>
        <input
          id={inputId}
          className="input input-lg"
          type="text"
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => onValueChange(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              onConfirm();
            }
          }}
        />
        {hint ? <span className="hint">{hint}</span> : null}
      </div>
      {error ? (
        <div className="dialog-error" role="alert">
          <span>{error}</span>
        </div>
      ) : null}
    </Dialog>
  );
}
