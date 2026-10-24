import { Icon } from '../ui/Icon';

export function SearchView() {
  return (
    <div className="search-pane" data-testid="view-search">
      <div className="search-form">
        <div className="search-input-wrap">
          <Icon name="search" size="sm" />
          <input
            className="input"
            type="text"
            placeholder="Search workspace"
            aria-label="Search workspace"
            disabled
          />
        </div>
        <div className="search-options">
          <button className="toggle-chip" type="button" aria-pressed={false} aria-label="Match case" disabled>
            Aa
          </button>
          <button className="toggle-chip" type="button" aria-pressed={false} aria-label="Match whole word" disabled>
            ab
          </button>
          <button className="toggle-chip" type="button" aria-pressed={false} aria-label="Use regular expression" disabled>
            .*
          </button>
          <span className="search-scope">Workspace</span>
        </div>
      </div>
      <div className="search-empty-state">
        Open a folder to search across its files. Matches appear here, grouped by file.
      </div>
    </div>
  );
}
