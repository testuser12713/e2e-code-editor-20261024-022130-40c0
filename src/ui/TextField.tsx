import { useId } from 'react';
import type { InputHTMLAttributes } from 'react';

import { cn } from '../lib/cn';

export type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
};

export function TextField({ label, hint, id, className, ...props }: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className="field">
      {label ? (
        <label className="label" htmlFor={inputId}>
          {label}
        </label>
      ) : null}
      <input id={inputId} className={cn('input', className)} {...props} />
      {hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}
