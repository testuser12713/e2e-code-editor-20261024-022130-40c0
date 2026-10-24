import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { COMMAND_IDS, COMMAND_KEYBINDINGS } from '../commands/ids';
import { hasCommand, registerCommands, runCommand } from '../commands/registry';
import { platform } from '../platform';
import { appStore, useAppStore } from '../state/store';
import type { SearchHit, SearchQuery, SearchResultGroup } from '../state/types';
import { Icon } from '../ui/Icon';
import { notify } from '../ui/Notify';

type SearchStatus = 'idle' | 'running' | 'done' | 'cancelled' | 'error';

type SearchOptions = Pick<SearchQuery, 'caseSensitive' | 'wholeWord' | 'regex'>;

const SEARCH_OPTIONS: { field: keyof SearchOptions; label: string; text: string }[] = [
  { field: 'caseSensitive', label: 'Match case', text: 'Aa' },
  { field: 'wholeWord', label: 'Match whole word', text: 'ab' },
  { field: 'regex', label: 'Use regular expression', text: '.*' },
];

let searchSequence = 0;
let focusQueryField: (() => void) | null = null;

function nextSearchId(): string {
  searchSequence += 1;
  return `project-search-${searchSequence}`;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) return error.message;
  if (typeof error === 'string' && error.length > 0) return error;
  return 'The search could not be completed.';
}

function countHits(groups: SearchResultGroup[]): number {
  return groups.reduce((total, group) => total + group.hits.length, 0);
}

function hitKey(hit: SearchHit): string {
  return `${hit.relPath}:${hit.line}:${hit.column}`;
}

function renderHitText(hit: SearchHit): ReactNode {
  const start = Math.max(0, Math.min(hit.column - 1, hit.lineText.length));
  const length = Math.max(hit.matchLength, 0);
  const end = Math.max(start, Math.min(start + length, hit.lineText.length));

  if (end <= start) return hit.lineText;

  return (
    <>
      {hit.lineText.slice(0, start)}
      <mark>{hit.lineText.slice(start, end)}</mark>
      {hit.lineText.slice(end)}
    </>
  );
}

registerCommands([
  {
    id: COMMAND_IDS.projectSearch,
    title: 'Search: Find in Files',
    keybinding: COMMAND_KEYBINDINGS[COMMAND_IDS.projectSearch],
    run: () => {
      appStore.dispatch({ type: 'view/showSearch' });
      focusQueryField?.();
      return true;
    },
  },
]);

export function SearchView() {
  const state = useAppStore();
  const root = state.workspace.root;
  const hasWorkspace = root !== null;

  const inputRef = useRef<HTMLInputElement | null>(null);
  const currentSearchId = useRef<string | null>(null);

  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<SearchOptions>({
    caseSensitive: false,
    wholeWord: false,
    regex: false,
  });
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [results, setResults] = useState<SearchResultGroup[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [activeHit, setActiveHit] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    focusQueryField = () => {
      inputRef.current?.focus();
    };

    const input = inputRef.current;
    if (input && !input.disabled) input.focus();

    return () => {
      focusQueryField = null;
    };
  }, [root]);

  useEffect(() => {
    const running = currentSearchId.current;
    if (running !== null) {
      currentSearchId.current = null;
      void platform.search.cancel(running).catch(() => undefined);
    }
    setResults([]);
    setCollapsed({});
    setActiveHit(null);
    setFailure(null);
    setStatus('idle');
  }, [root]);

  const abortCurrent = () => {
    const running = currentSearchId.current;
    if (running === null) return;
    currentSearchId.current = null;
    void platform.search.cancel(running).catch(() => undefined);
  };

  const executeSearch = async (text: string, nextOptions: SearchOptions) => {
    if (!hasWorkspace || text.length === 0) {
      abortCurrent();
      setResults([]);
      setFailure(null);
      setStatus('idle');
      return;
    }

    abortCurrent();

    const searchId = nextSearchId();
    currentSearchId.current = searchId;
    setStatus('running');
    setFailure(null);

    try {
      const groups = await platform.search.run(
        {
          text,
          caseSensitive: nextOptions.caseSensitive,
          wholeWord: nextOptions.wholeWord,
          regex: nextOptions.regex,
        },
        searchId,
      );
      if (currentSearchId.current !== searchId) return;
      currentSearchId.current = null;
      setResults(Array.isArray(groups) ? groups : []);
      setActiveHit(null);
      setStatus('done');
    } catch (error) {
      if (currentSearchId.current !== searchId) return;
      currentSearchId.current = null;
      const message = errorMessage(error);
      setResults([]);
      setFailure(message);
      setStatus('error');
      notify(message, 'error');
    }
  };

  const toggleOption = (field: keyof SearchOptions) => {
    const nextOptions = { ...options, [field]: !options[field] };
    setOptions(nextOptions);
    if (query.length > 0 && status !== 'idle') {
      void executeSearch(query, nextOptions);
    }
  };

  const cancelSearch = () => {
    if (currentSearchId.current === null) return;
    abortCurrent();
    setStatus('cancelled');
  };

  const toggleGroup = (relPath: string) => {
    setCollapsed((current) => ({ ...current, [relPath]: !current[relPath] }));
  };

  const openHit = (hit: SearchHit) => {
    if (!hasCommand(COMMAND_IDS.openFile)) {
      notify('Opening files is not available yet.', 'info');
      return;
    }

    void runCommand(COMMAND_IDS.openFile, {
      relPath: hit.relPath,
      line: hit.line,
      column: hit.column,
    }).then((opened) => {
      if (opened) setActiveHit(hitKey(hit));
    });
  };

  const totalHits = countHits(results);
  const scopeLabel = results.length > 0
    ? `${results.length} ${results.length === 1 ? 'file' : 'files'}`
    : 'Workspace';
  const runningSummary = results.length > 0
    ? ` · ${totalHits} ${totalHits === 1 ? 'match' : 'matches'} in ${results.length} ${results.length === 1 ? 'file' : 'files'} so far`
    : '';

  return (
    <div className="search-pane" data-od-id="search-panel" data-testid="view-search">
      <form
        className="search-form"
        data-search-form
        onSubmit={(event) => {
          event.preventDefault();
          void executeSearch(query, options);
        }}
      >
        <div className="search-input-wrap">
          <Icon name="search" size="sm" />
          <input
            ref={inputRef}
            className="input"
            type="search"
            value={query}
            placeholder="Search across workspace"
            aria-label="Search across workspace"
            data-od-id="search-query"
            data-testid="search-query"
            disabled={!hasWorkspace}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="search-options">
          {SEARCH_OPTIONS.map((option) => (
            <button
              key={option.field}
              className="toggle-chip"
              type="button"
              title={option.label}
              aria-label={option.label}
              aria-pressed={options[option.field]}
              data-search-toggle
              data-testid={`search-toggle-${option.field}`}
              disabled={!hasWorkspace}
              onClick={() => toggleOption(option.field)}
            >
              {option.text}
            </button>
          ))}
          <span className="search-scope">{scopeLabel}</span>
        </div>
      </form>

      {status === 'running' ? (
        <div className="search-status" aria-live="polite">
          <span className="spinner" aria-hidden="true" />
          <span data-search-state>Scanning workspace files{runningSummary}</span>
          <button className="search-cancel" type="button" data-cancel-search data-testid="search-cancel" onClick={cancelSearch}>
            Cancel
          </button>
        </div>
      ) : null}

      {status === 'cancelled' ? (
        <div className="search-status" aria-live="polite">
          <span data-search-state>
            Search cancelled. {totalHits} {totalHits === 1 ? 'match' : 'matches'} in {results.length}{' '}
            {results.length === 1 ? 'file' : 'files'} kept.
          </span>
        </div>
      ) : null}

      <div className="search-results" role="tree" aria-label="Search results">
        {!hasWorkspace ? (
          <div className="search-empty-state">
            Open a folder to search across its files. Matches appear here, grouped by file.
          </div>
        ) : null}

        {hasWorkspace ? (
          <>
            {results.map((group) => {
              const isCollapsed = Boolean(collapsed[group.relPath]);
              return (
                <div className="result-file" key={group.relPath}>
                  <button
                    className="result-file-head"
                    type="button"
                    aria-expanded={!isCollapsed}
                    title={group.relPath}
                    data-testid={`search-file-${group.relPath}`}
                    onClick={() => toggleGroup(group.relPath)}
                  >
                    <Icon name={isCollapsed ? 'chevron' : 'chevron-down'} size="sm" className="tree-icon" />
                    <span>{group.relPath}</span>
                    <span className="result-count">{group.hits.length}</span>
                  </button>
                  <div className="result-hits" hidden={isCollapsed}>
                    {group.hits.map((hit, index) => {
                      const key = hitKey(hit);
                      return (
                        <button
                          key={`${key}:${index}`}
                          className="result-hit"
                          type="button"
                          title={`${group.relPath}:${hit.line}`}
                          aria-current={activeHit === key ? 'true' : undefined}
                          data-search-hit
                          data-search-file={group.relPath}
                          data-line={hit.line}
                          data-testid={`search-hit-${group.relPath}-${hit.line}-${hit.column}`}
                          onClick={() => openHit(hit)}
                        >
                          <span className="result-line">{hit.line}</span>
                          <span className="result-text">{renderHitText(hit)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {status === 'error' ? (
              <div className="search-empty-state" role="alert">
                {failure ?? 'The search could not be completed.'}
              </div>
            ) : null}

            {status === 'done' && results.length === 0 ? (
              <div className="search-empty-state">No matches. Try a broader query.</div>
            ) : null}

            {status === 'idle' ? (
              <div className="search-empty-state">
                Type a query and press Enter to search every text file in the workspace.
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
