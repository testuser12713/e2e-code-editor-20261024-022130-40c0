import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';

import { cn } from '../lib/cn';
import { Button } from './Button';
import { Dialog } from './Dialog';
import { Icon, type IconName } from './Icon';

export type PromptDialogProps = {
  open: boolean;
  title: string;
  subtitle?: ReactNode;
  label: string;
  hint?: string;
  placeholder?: string;
  value: string;
  error?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  meta?: string;
  icon?: IconName;
  contained?: boolean;
  autoFocus?: boolean;
  inputClassName?: string;
  inputTestId?: string;
  onValueChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  testId?: string;
};

export function PromptDialog({
  open,
  title,
  subtitle,
  label,
  hint,
  placeholder,
  value,
  error,
  confirmLabel = 'Create',
  cancelLabel = 'Cancel',
  meta,
  icon = 'new-file',
  contained = false,
  autoFocus = true,
  inputClassName,
  inputTestId,
  onValueChange,
  onConfirm,
  onCancel,
  testId,
}: PromptDialogProps) {
  const inputId = useId();
  const hintId = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !autoFocus) return;
    inputRef.current?.focus();
  }, [open, autoFocus]);

  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;

  return (
    <Dialog
      open={open}
      title={title}
      subtitle={subtitle}
      icon={icon}
      iconTone="accent"
      contained={contained}
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
          ref={inputRef}
          id={inputId}
          className={cn('input', 'input-lg', inputClassName)}
          type="text"
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          data-testid={inputTestId}
          onChange={(event) => onValueChange(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              onConfirm();
            }
          }}
        />
        {hint ? (
          <span className="hint" id={hintId}>
            {hint}
          </span>
        ) : null}
      </div>
      {error ? (
        <div className="dialog-error" id={errorId} role="alert">
          <Icon name="alert" size="sm" />
          <span>{error}</span>
        </div>
      ) : null}
    </Dialog>
  );
}
