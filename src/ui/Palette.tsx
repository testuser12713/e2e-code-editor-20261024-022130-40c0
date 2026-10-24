import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';

import { Icon, type IconName } from './Icon';

export type PaletteProps = {
  open: boolean;
  label: string;
  placeholder?: string;
  icon?: IconName;
  query?: string;
  onQueryChange?: (value: string) => void;
  onClose: () => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  footer?: ReactNode;
  children: ReactNode;
  testId?: string;
};

export function Palette({
  open,
  label,
  placeholder,
  icon = 'search',
  query,
  onQueryChange,
  onClose,
  onKeyDown,
  footer,
  children,
  testId,
}: PaletteProps) {
  const [internalQuery, setInternalQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const controlled = query !== undefined;
  const value = controlled ? query : internalQuery;

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const update = (next: string) => {
    if (!controlled) setInternalQuery(next);
    onQueryChange?.(next);
  };

  return (
    <>
      <div className="scrim" aria-hidden="true" onMouseDown={onClose} />
      <section className="palette" role="dialog" aria-modal="true" aria-label={label} data-testid={testId}>
        <div className="palette-input-row">
          <Icon name={icon} size="sm" />
          <input
            ref={inputRef}
            className="palette-input"
            type="text"
            value={value}
            placeholder={placeholder}
            aria-label={placeholder ?? label}
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => update(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
                return;
              }
              onKeyDown?.(event);
            }}
          />
          <span className="kbd">Esc</span>
        </div>
        <div className="palette-list">{children}</div>
        {footer ? <div className="palette-footer">{footer}</div> : null}
      </section>
    </>
  );
}
