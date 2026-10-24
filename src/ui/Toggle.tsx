import { useId } from 'react';

import { cn } from '../lib/cn';

export type ToggleProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
  testId?: string;
};

export function Toggle({
  label,
  checked,
  onChange,
  disabled = false,
  id,
  className,
  testId,
}: ToggleProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <label className={cn('switch', className)} htmlFor={inputId} data-testid={testId}>
      <input
        id={inputId}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={label}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
      <span className="switch-track" aria-hidden="true" />
    </label>
  );
}
