import { useId } from 'react';
import type { InputHTMLAttributes } from 'react';

import { cn } from '../lib/cn';
import { Icon } from './Icon';

export type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
  inputSize?: 'md' | 'lg';
  testId?: string;
};

export function TextField({
  label,
  hint,
  error,
  inputSize = 'md',
  id,
  className,
  testId,
  ...props
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('field', error ? 'has-error' : undefined)}>
      {label ? (
        <label className="label" htmlFor={inputId}>
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        className={cn('input', inputSize === 'lg' ? 'input-lg' : undefined, className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        data-testid={testId}
        {...props}
      />
      {error ? (
        <span className="dialog-error field-error" id={errorId} role="alert">
          <Icon name="alert" size="sm" />
          <span>{error}</span>
        </span>
      ) : null}
      {hint ? (
        <span className="hint" id={hintId}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}
