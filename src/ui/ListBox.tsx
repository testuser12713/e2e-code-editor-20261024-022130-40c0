import type { ReactNode } from 'react';

import { cn } from '../lib/cn';
import { Icon, type IconName } from './Icon';

export type ListBoxProps<T> = {
  items: T[];
  getKey: (item: T) => string;
  getLabel: (item: T) => string;
  getDetail?: (item: T) => string | undefined;
  getIcon?: (item: T) => IconName | undefined;
  getTrailing?: (item: T) => ReactNode;
  isDisabled?: (item: T) => boolean;
  selectedKey?: string | null;
  onSelect: (item: T) => void;
  emptyMessage?: string;
  variant?: 'palette' | 'recent';
  ariaLabel?: string;
  className?: string;
  testId?: string;
};

export function ListBox<T>({
  items,
  getKey,
  getLabel,
  getDetail,
  getIcon,
  getTrailing,
  isDisabled,
  selectedKey,
  onSelect,
  emptyMessage = 'No matching entries.',
  variant = 'palette',
  ariaLabel,
  className,
  testId,
}: ListBoxProps<T>) {
  if (items.length === 0) {
    return (
      <div className={cn('palette-empty', className)} data-testid={testId}>
        {emptyMessage}
      </div>
    );
  }

  const recent = variant === 'recent';

  return (
    <div
      role="listbox"
      aria-label={ariaLabel}
      className={cn(recent ? 'recent-list' : 'palette-list-inner', className)}
      data-testid={testId}
    >
      {items.map((item) => {
        const key = getKey(item);
        const label = getLabel(item);
        const detail = getDetail?.(item);
        const icon = getIcon?.(item);
        const trailing = getTrailing?.(item);
        const disabled = isDisabled?.(item) === true;
        const selected = selectedKey === key;

        if (recent) {
          return (
            <button
              key={key}
              type="button"
              role="option"
              aria-selected={selected}
              aria-disabled={disabled || undefined}
              disabled={disabled}
              className={cn('recent-item', selected ? 'is-selected' : undefined)}
              onClick={() => onSelect(item)}
            >
              {icon ? (
                <span className="recent-icon">
                  <Icon name={icon} size="sm" />
                </span>
              ) : null}
              <span className="recent-copy">
                <span className="recent-name">{label}</span>
                {detail ? <span className="recent-path">{detail}</span> : null}
              </span>
              {trailing}
            </button>
          );
        }

        return (
          <button
            key={key}
            type="button"
            role="option"
            aria-selected={selected}
            aria-disabled={disabled || undefined}
            disabled={disabled}
            className={cn('palette-item', selected ? 'is-selected' : undefined)}
            onClick={() => onSelect(item)}
          >
            <span className="palette-icon">{icon ? <Icon name={icon} size="sm" /> : null}</span>
            <span className="palette-label">
              {label}
              {detail ? <span className="palette-detail">{detail}</span> : null}
            </span>
            {trailing}
          </button>
        );
      })}
    </div>
  );
}
