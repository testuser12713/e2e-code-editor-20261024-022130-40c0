import { cn } from '../lib/cn';
import type { Tab } from '../state/types';
import { Icon } from './Icon';

export type TabChipProps = {
  tab: Tab;
  active: boolean;
  dirty: boolean;
  onSelect: (tabId: string) => void;
  onClose: (tabId: string) => void;
  className?: string;
  testId?: string;
};

export function TabChip({
  tab,
  active,
  dirty,
  onSelect,
  onClose,
  className,
  testId,
}: TabChipProps) {
  return (
    <div
      className={cn('tab', active ? 'is-active' : undefined, className)}
      role="tab"
      tabIndex={active ? 0 : -1}
      aria-selected={active}
      data-testid={testId}
      onClick={() => onSelect(tab.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(tab.id);
        }
      }}
    >
      <Icon name="file" size="sm" className="tab-icon" />
      <span className="tab-title">{tab.name}</span>
      {dirty ? <span className="tab-dot" role="img" aria-label="Unsaved changes" title="Unsaved changes" /> : null}
      <button
        className="tab-close"
        type="button"
        aria-label={`Close ${tab.name}`}
        onClick={(event) => {
          event.stopPropagation();
          onClose(tab.id);
        }}
      >
        <Icon name="close" size="sm" />
      </button>
    </div>
  );
}
