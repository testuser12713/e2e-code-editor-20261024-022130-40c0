import { useId } from 'react';

export type ToggleProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
};

export function Toggle({ label, checked, onChange, disabled = false, id }: ToggleProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <label className="switch" htmlFor={inputId}>
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
