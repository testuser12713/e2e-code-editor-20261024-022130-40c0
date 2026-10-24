import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';

import { cn } from '../lib/cn';
import { Icon, type IconName } from './Icon';

export type PaletteItem = {
  id: string;
  label: string;
  detail?: string;
  icon?: IconName;
  keybinding?: string;
  disabled?: boolean;
};

export type PaletteGroup = {
  id?: string;
  label: string;
  items: PaletteItem[];
};

export type PaletteHint = {
  keys: string;
  label: string;
};

export type PaletteProps = {
  open?: boolean;
  label: string;
  placeholder?: string;
  icon?: IconName;
  query?: string;
  onQueryChange?: (value: string) => void;
  groups?: PaletteGroup[];
  selectedId?: string | null;
  onSelectedChange?: (id: string) => void;
  onSelect?: (item: PaletteItem) => void;
  onClose: () => void;
  emptyMessage?: string;
  footer?: ReactNode;
  enterLabel?: string;
  hints?: PaletteHint[];
  focusInput?: boolean;
  contained?: boolean;
  children?: ReactNode;
  onKeyDown?: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
  testId?: string;
};

const DEFAULT_HINTS = (enterLabel: string): PaletteHint[] => [
  { keys: '↑↓', label: 'Navigate' },
  { keys: 'Enter', label: enterLabel },
  { keys: 'Esc', label: 'Close' },
];

export function Palette({
  open = true,
  label,
  placeholder,
  icon = 'search',
  query,
  onQueryChange,
  groups,
  selectedId,
  onSelectedChange,
  onSelect,
  onClose,
  emptyMessage = 'No matches.',
  footer,
  enterLabel = 'Open',
  hints,
  focusInput = true,
  contained = false,
  children,
  onKeyDown,
  testId,
}: PaletteProps) {
  const idBase = useId();
  const [internalQuery, setInternalQuery] = useState('');
  const [internalMark, setInternalMark] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const controlledQuery = query !== undefined;
  const value = controlledQuery ? query : internalQuery;

  const flatItems = groups ? groups.flatMap((group) => group.items) : [];
  const selectable = flatItems.filter((item) => !item.disabled);
  const markedId = selectedId !== undefined ? selectedId : internalMark;
  const markedItem = flatItems.find((item) => item.id === markedId && !item.disabled) ?? null;
  const groupMode = groups !== undefined;

  useEffect(() => {
    if (!open || !groupMode) return;
    if (selectable.some((item) => item.id === markedId)) return;
    setInternalMark(selectable[0]?.id ?? null);
  }, [open, groups, markedId]);

  useEffect(() => {
    if (!open) return;
    const onDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onDocumentKeyDown);
    return () => document.removeEventListener('keydown', onDocumentKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !focusInput) return;
    inputRef.current?.focus();
  }, [open, focusInput]);

  useEffect(() => {
    if (!groupMode || !markedItem) return;
    const index = flatItems.findIndex((item) => item.id === markedItem.id);
    if (index < 0) return;
    const node = document.getElementById(`${idBase}-option-${index}`);
    node?.scrollIntoView?.({ block: 'nearest' });
  }, [markedItem, groupMode]);

  if (!open) return null;

  const setMark = (id: string) => {
    setInternalMark(id);
    onSelectedChange?.(id);
  };

  const moveMark = (direction: 1 | -1) => {
    if (selectable.length === 0) return;
    const current = selectable.findIndex((item) => item.id === markedId);
    const next =
      current < 0
        ? direction === 1
          ? 0
          : selectable.length - 1
        : (current + direction + selectable.length) % selectable.length;
    setMark(selectable[next].id);
  };

  const activate = () => {
    const target = markedItem ?? selectable[0];
    if (!target) return;
    onSelect?.(target);
  };

  const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;

    if (groupMode && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      moveMark(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }
    if (groupMode && event.key === 'Enter') {
      event.preventDefault();
      activate();
    }
  };

  const update = (next: string) => {
    if (!controlledQuery) setInternalQuery(next);
    onQueryChange?.(next);
  };

  const options = groups ? groups.filter((group) => group.items.length > 0) : [];
  const markedIdInList = markedItem ? `${idBase}-option-${flatItems.findIndex((item) => item.id === markedItem.id)}` : undefined;

  return (
    <>
      {!contained ? (
        <div className="scrim" aria-hidden="true" onMouseDown={onClose} />
      ) : null}
      <section
        className={cn('palette', contained ? 'is-contained' : undefined)}
        role="dialog"
        aria-modal={contained ? undefined : true}
        aria-label={label}
        data-testid={testId}
      >
        <div className="palette-input-row">
          <Icon name={icon} size="sm" />
          <input
            ref={inputRef}
            className="palette-input"
            type="text"
            value={value}
            placeholder={placeholder}
            aria-label={placeholder ?? label}
            aria-activedescendant={markedIdInList}
            aria-controls={groupMode ? `${idBase}-listbox` : undefined}
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => update(event.currentTarget.value)}
            onKeyDown={handleInputKeyDown}
          />
          <span className="kbd">Esc</span>
        </div>
        <div
          id={`${idBase}-listbox`}
          className="palette-list"
          role={groupMode ? 'listbox' : undefined}
          aria-label={groupMode ? `${label} results` : undefined}
        >
          {groupMode ? (
            flatItems.length === 0 ? (
              <div className="palette-empty">{emptyMessage}</div>
            ) : (
              options.map((group, groupIndex) => (
                <div
                  key={group.id ?? `${group.label}-${groupIndex}`}
                  role="group"
                  aria-label={group.label}
                >
                  <div className="palette-group">{group.label}</div>
                  {group.items.map((item) => {
                    const flatIndex = flatItems.findIndex((entry) => entry.id === item.id);
                    const marked = markedId === item.id;
                    return (
                      <button
                        key={item.id}
                        id={`${idBase}-option-${flatIndex}`}
                        type="button"
                        role="option"
                        aria-selected={marked}
                        aria-disabled={item.disabled || undefined}
                        disabled={item.disabled}
                        className={cn('palette-item', marked ? 'is-selected' : undefined)}
                        data-testid={testId ? `${testId}-item-${item.id}` : undefined}
                        onMouseEnter={() => {
                          if (!item.disabled) setMark(item.id);
                        }}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          if (item.disabled) return;
                          setMark(item.id);
                          onSelect?.(item);
                        }}
                      >
                        <span className="palette-icon">
                          {item.icon ? <Icon name={item.icon} size="sm" /> : null}
                        </span>
                        <span className="palette-label">
                          {item.label}
                          {item.detail ? <span className="palette-detail">{item.detail}</span> : null}
                        </span>
                        {item.keybinding ? <span className="kbd">{item.keybinding}</span> : null}
                      </button>
                    );
                  })}
                </div>
              ))
            )
          ) : (
            children
          )}
        </div>
        <div className="palette-footer">
          <span>{footer}</span>
          <div className="palette-hints">
            {(hints ?? DEFAULT_HINTS(enterLabel)).map((hint) => (
              <span key={hint.keys} className="palette-hint">
                <span className="kbd">{hint.keys}</span>
                {hint.label}
              </span>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
