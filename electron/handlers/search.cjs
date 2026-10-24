'use strict';

const { searchWorkspace, DEFAULT_MAX_HITS } = require('../lib/search.cjs');
const workspace = require('./workspace.cjs');

const MAX_QUERY_LENGTH = 2000;
const MAX_SEARCH_ID_LENGTH = 200;

const controllers = new Map();

function validateQuery(query) {
  if (!query || typeof query !== 'object') {
    throw new Error('The search query is not valid.');
  }
  if (typeof query.text !== 'string' || query.text.length === 0) {
    throw new Error('The search text must be a non-empty string.');
  }
  if (query.text.length > MAX_QUERY_LENGTH) {
    throw new Error(`The search text must be at most ${MAX_QUERY_LENGTH} characters.`);
  }
  if (
    typeof query.caseSensitive !== 'boolean'
    || typeof query.wholeWord !== 'boolean'
    || typeof query.regex !== 'boolean'
  ) {
    throw new Error('The search options must be booleans.');
  }
  return {
    text: query.text,
    caseSensitive: query.caseSensitive,
    wholeWord: query.wholeWord,
    regex: query.regex,
  };
}

function validateSearchId(searchId) {
  if (typeof searchId !== 'string' || searchId.trim().length === 0) {
    throw new Error('A search id is required.');
  }
  if (searchId.length > MAX_SEARCH_ID_LENGTH) {
    throw new Error('The search id is not valid.');
  }
  return searchId;
}

async function run(query, searchId) {
  const normalized = validateQuery(query);
  const id = validateSearchId(searchId);

  const root = await workspace.getRoot();
  if (typeof root !== 'string' || root.length === 0) {
    throw new Error('No workspace folder is open.');
  }

  const previous = controllers.get(id);
  if (previous) previous.abort();

  const controller = new AbortController();
  controllers.set(id, controller);

  try {
    return await searchWorkspace(root, normalized, {
      maxHits: DEFAULT_MAX_HITS,
      isCancelled: () => controller.signal.aborted,
    });
  } finally {
    if (controllers.get(id) === controller) {
      controllers.delete(id);
    }
  }
}

async function cancel(searchId) {
  if (typeof searchId !== 'string' || searchId.length === 0) return;
  const controller = controllers.get(searchId);
  if (!controller) return;
  controller.abort();
  controllers.delete(searchId);
}

module.exports = { run, cancel };
