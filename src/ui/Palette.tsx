import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';

import { cn } from '../lib/cn';
import { Icon, type IconName } from './Icon';
import './palette.css';

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

type PaletteRowSpan = { top: number; bottom: number };

/**
 * Caps the list to the tallest run of whole entries that fits into the height
 * the design allows. Returns null when no complete entry fits.
 */
export function wholeRowListHeight(
  rows: PaletteRowSpan[],
  maxHeight: number,
  paddingBottom: number,
): number | null {
  if (maxHeight <= 0) return null;
  const viewport = maxHeight - paddingBottom;
  let boundary = 0;

  for (const row of rows) {
    if (row.bottom <= viewport + 0.5 && row.bottom > boundary) boundary = row.bottom;
  }

  return boundary > 0 ? boundary + paddingBottom : null;
}

/**
 * Finds the scroll offset at which the marked row is visible and the bottom
 * edge of the list sits on a row boundary. The visible area therefore always
 * ends on a whole entry instead of slicing the next one in half.
 */
export function bottomAlignedScrollTop(
  rows: PaletteRowSpan[],
  viewport: number,
  scrollTop: number,
  target: PaletteRowSpan,
  maxScroll: number,
): number {
  if (rows.length === 0 || viewport <= 0) return scrollTop;

  const currentBottom = scrollTop + viewport;
  let chosen: number | null = null;

  for (const row of rows) {
    if (row.bottom < target.bottom - 0.5) continue;
    if (row.bottom > target.top + viewport + 0.5) continue;
    if (chosen === null || Math.abs(row.bottom - currentBottom) < Math.abs(chosen - currentBottom)) {
      chosen = row.bottom;
    }
  }

  if (chosen === null) {
    for (const row of rows) {
      if (row.bottom < target.bottom - 0.5) continue;
      chosen = row.bottom;
      break;
    }
  }

  if (chosen === null) return scrollTop;
  return Math.max(0, Math.min(maxScroll, chosen - viewport));
}

/** Scrolls the marked option into view while keeping the list's bottom on a row boundary. */
export function revealPaletteRow(list: HTMLElement | null): void {
  if (!list) return;
  const targetElement = list.querySelector<HTMLElement>('[role="option"][aria-selected="true"]');
  if (!targetElement) return;
  const rowElements = Array.from(list.querySelectorAll<HTMLElement>('[role="option"]'));
  if (rowElements.length === 0) return;

  const listRect = list.getBoundingClientRect();
  const listStyles = window.getComputedStyle(list);
  const paddingBottom = parseFloat(listStyles.paddingBottom) || 0;
  const borderTop = parseFloat(listStyles.borderTopWidth) || 0;
  const borderBottom = parseFloat(listStyles.borderBottomWidth) || 0;
  const viewport = listRect.height - borderTop - borderBottom - paddingBottom;
  if (viewport <= 0) return;

  const listTop = listRect.top + borderTop;
  const scrollTop = list.scrollTop;
  const spanOf = (element: HTMLElement): PaletteRowSpan => {
    const rect = element.getBoundingClientRect();
    return {
      top: rect.top - listTop + scrollTop,
      bottom: rect.bottom - listTop + scrollTop,
    };
  };

  const rows = rowElements.map(spanOf);
  const target = spanOf(targetElement);
  const maxScroll = Math.max(0, list.scrollHeight - list.clientHeight);
  const next = bottomAlignedScrollTop(rows, viewport, scrollTop, target, maxScroll);

  if (Math.abs(next - scrollTop) > 0.5) list.scrollTop = next;
}

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
  const [listHeight, setListHeight] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const controlledQuery = query !== undefined;
  const value = controlledQuery ? query : internalQuery;

  const fitListToRows = useCallback(() => {
    const list = listRef.current;
    if (!list) return;

    const styles = window.getComputedStyle(list);
    const paddingBottom = parseFloat(styles.paddingBottom) || 0;
    const borderTop = parseFloat(styles.borderTopWidth) || 0;
    const borderBottom = parseFloat(styles.borderBottomWidth) || 0;

    list.style.height = '';
    const listRect = list.getBoundingClientRect();
    const clampedHeight = listRect.height;
    const overflow = list.scrollHeight - list.clientHeight;
    let next: number | null = null;

    if (clampedHeight > 0 && overflow > 1) {
      const listTop = listRect.top + borderTop;
      const scrollTop = list.scrollTop;
      const rows = Array.from(list.querySelectorAll<HTMLElement>('[role="option"]')).map((row) => {
        const rect = row.getBoundingClientRect();
        return {
          top: rect.top - listTop + scrollTop,
          bottom: rect.bottom - listTop + scrollTop,
        };
      });
      next = wholeRowListHeight(rows, clampedHeight - borderTop - borderBottom, paddingBottom);
    }

    list.style.height = next === null ? '' : `${next}px`;
    setListHeight((current) => (current === next ? current : next));
    revealPaletteRow(list);
  }, []);

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

  useLayoutEffect(() => {
    if (!open) return;
    fitListToRows();
  });

  useLayoutEffect(() => {
    if (!groupMode || !markedItem) return;
    revealPaletteRow(listRef.current);
  }, [markedItem, groupMode]);

  useEffect(() => {
    if (!open) return undefined;
    const onResize = () => fitListToRows();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [open, fitListToRows]);

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
          ref={listRef}
          id={`${idBase}-listbox`}
          className="palette-list"
          style={listHeight === null ? undefined : { height: `${listHeight}px` }}
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
