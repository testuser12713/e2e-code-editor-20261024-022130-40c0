import { cn } from '../lib/cn';
import type { Tab } from '../state/types';
import { Icon } from './Icon';

export type TabChipProps = {
  tab: Tab;
  active: boolean;
  dirty: boolean;
  onSelect: (tabId: string) => void;
  onClose: (tabId: string) => void;
};

export function TabChip({ tab, active, dirty, onSelect, onClose }: TabChipProps) {
  return (
    <div
      className={cn('tab', active ? 'is-active' : undefined)}
      role="tab"
      tabIndex={active ? 0 : -1}
      aria-selected={active}
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
      {dirty ? <span className="tab-dot" title="Unsaved changes" /> : null}
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
