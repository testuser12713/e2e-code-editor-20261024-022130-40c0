import { useEffect, useRef } from 'react';

import { cn } from '../lib/cn';
import { Icon } from './Icon';
import type { MenuEntry } from './Menu';

export type ContextMenuProps = {
  x: number;
  y: number;
  label: string;
  items: MenuEntry[];
  onClose: () => void;
  testId?: string;
};

function isSeparator(entry: MenuEntry): entry is { separator: true } {
  return 'separator' in entry;
}

export function ContextMenu({ x, y, label, items, onClose, testId }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  const width = 216;
  const height = 210;
  const left = Math.max(8, Math.min(x, window.innerWidth - width - 8));
  const top = Math.max(8, Math.min(y, window.innerHeight - height - 8));

  return (
    <div
      ref={menuRef}
      className="context-menu"
      role="menu"
      aria-label={label}
      data-testid={testId}
      style={{ position: 'fixed', left, top }}
    >
      {items.map((entry, index) => {
        if (isSeparator(entry)) {
          return <div key={`separator-${index}`} className="menu-sep" />;
        }
        const disabled = entry.disabled === true || !entry.onSelect;
        return (
          <button
            key={entry.label}
            type="button"
            role="menuitem"
            className={cn('menu-item', entry.danger ? 'is-danger' : undefined)}
            aria-disabled={disabled}
            disabled={disabled}
            onClick={() => {
              if (disabled) return;
              entry.onSelect?.();
              onClose();
            }}
          >
            <span className="menu-item-label">
              {entry.icon ? <Icon name={entry.icon} size="sm" /> : null}
              {entry.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
