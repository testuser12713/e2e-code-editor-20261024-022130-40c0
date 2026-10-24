import { useEffect, useRef, useState } from 'react';

import { cn } from '../lib/cn';
import { Icon, type IconName } from './Icon';

export type MenuAction = {
  label: string;
  keybinding?: string;
  icon?: IconName;
  disabled?: boolean;
  danger?: boolean;
  onSelect?: () => void;
};

export type MenuSeparator = { separator: true };

export type MenuEntry = MenuAction | MenuSeparator;

export type MenuProps = {
  label: string;
  items: MenuEntry[];
  testId?: string;
};

function isSeparator(entry: MenuEntry): entry is MenuSeparator {
  return 'separator' in entry;
}

export function Menu({ label, items, testId }: MenuProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const toggle = () => {
    if (!open) {
      const trigger = triggerRef.current;
      const titlebar = trigger?.closest('.titlebar');
      if (trigger && titlebar) {
        const triggerRect = trigger.getBoundingClientRect();
        const titlebarRect = titlebar.getBoundingClientRect();
        const menuWidth = menuRef.current?.offsetWidth || 236;
        setPosition({
          left: Math.max(4, Math.min(triggerRect.left - titlebarRect.left, window.innerWidth - menuWidth - 8)),
          top: triggerRect.bottom - titlebarRect.top + 4,
        });
      }
    }
    setOpen((current) => !current);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        data-testid={testId}
        onClick={toggle}
      >
        {label}
      </button>
      <div
        ref={menuRef}
        className="menu"
        role="menu"
        aria-label={label}
        hidden={!open}
        style={position ? { left: position.left, top: position.top } : undefined}
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
                setOpen(false);
              }}
            >
              <span className="menu-item-label">
                {entry.icon ? <Icon name={entry.icon} size="sm" /> : null}
                {entry.label}
              </span>
              {entry.keybinding ? <span className="kbd">{entry.keybinding}</span> : null}
            </button>
          );
        })}
      </div>
    </>
  );
}
