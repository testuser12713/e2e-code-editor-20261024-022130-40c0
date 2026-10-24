import { useEffect, useRef } from 'react';

import { cn } from '../lib/cn';
import { MenuList, type MenuEntry } from './Menu';

export type ContextMenuProps = {
  x: number;
  y: number;
  label: string;
  items: MenuEntry[];
  onClose: () => void;
  testId?: string;
  inline?: boolean;
};

export function ContextMenu({ x, y, label, items, onClose, testId, inline = false }: ContextMenuProps) {
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
      className={cn('context-menu', inline ? 'is-inline' : undefined)}
      role="menu"
      aria-label={label}
      data-testid={testId}
      style={inline ? undefined : { position: 'fixed', left, top }}
    >
      <MenuList
        items={items}
        onActivate={(entry) => {
          entry.onSelect?.();
          onClose();
        }}
      />
    </div>
  );
}
