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
  testId?: string;
  preview?: 'hover' | 'focus';
};

export type MenuSeparator = { separator: true };

export type MenuEntry = MenuAction | MenuSeparator;

export type MenuProps = {
  label: string;
  items: MenuEntry[];
  testId?: string;
  menuTestId?: string;
  defaultOpen?: boolean;
  inline?: boolean;
};

function isSeparator(entry: MenuEntry): entry is MenuSeparator {
  return 'separator' in entry;
}

export type MenuListProps = {
  items: MenuEntry[];
  onActivate: (entry: MenuAction) => void;
};

export function MenuList({ items, onActivate }: MenuListProps) {
  return (
    <>
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
            className={cn(
              'menu-item',
              entry.danger ? 'is-danger' : undefined,
              entry.preview === 'hover' ? 'is-preview-hover' : undefined,
              entry.preview === 'focus' ? 'is-preview-focus' : undefined,
            )}
            aria-disabled={disabled}
            disabled={disabled}
            data-testid={entry.testId}
            onClick={() => {
              if (disabled) return;
              onActivate(entry);
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
    </>
  );
}

export function Menu({ label, items, testId, menuTestId, defaultOpen = false, inline = false }: MenuProps) {
  const [open, setOpen] = useState(defaultOpen);
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
        className={cn('menu', inline ? 'is-inline' : undefined)}
        role="menu"
        aria-label={label}
        data-testid={menuTestId}
        hidden={!open}
        style={!inline && position ? { left: position.left, top: position.top } : undefined}
      >
        <MenuList
          items={items}
          onActivate={(entry) => {
            entry.onSelect?.();
            setOpen(false);
          }}
        />
      </div>
    </>
  );
}
