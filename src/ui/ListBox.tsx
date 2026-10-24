import { cn } from '../lib/cn';

export type ListBoxProps<T> = {
  items: T[];
  getKey: (item: T) => string;
  getLabel: (item: T) => string;
  getDetail?: (item: T) => string | undefined;
  selectedKey?: string | null;
  onSelect: (item: T) => void;
  emptyMessage?: string;
  className?: string;
};

export function ListBox<T>({
  items,
  getKey,
  getLabel,
  getDetail,
  selectedKey,
  onSelect,
  emptyMessage = 'No matching entries.',
  className,
}: ListBoxProps<T>) {
  if (items.length === 0) {
    return <div className="palette-empty">{emptyMessage}</div>;
  }

  return (
    <div role="listbox" className={cn('palette-list-inner', className)}>
      {items.map((item) => {
        const key = getKey(item);
        const detail = getDetail?.(item);
        return (
          <button
            key={key}
            type="button"
            role="option"
            aria-selected={selectedKey === key}
            className={cn('palette-item', selectedKey === key ? 'is-selected' : undefined)}
            onClick={() => onSelect(item)}
          >
            <span className="palette-label">
              {getLabel(item)}
              {detail ? <span className="palette-detail">{detail}</span> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
