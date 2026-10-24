'use strict';

const fs = require('node:fs');

const { assertRoot, resolveInWorkspace } = require('./pathGuard.cjs');
const { walkFiles } = require('./walkWorkspace.cjs');

const DEFAULT_MAX_HITS = 2000;
const MAX_SEARCH_BYTES = 2 * 1024 * 1024;
const BINARY_SAMPLE_BYTES = 8192;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildMatcher(query) {
  const source = query.regex ? query.text : escapeRegExp(query.text);
  const pattern = query.wholeWord ? `\\b(?:${source})\\b` : source;
  try {
    return new RegExp(pattern, query.caseSensitive ? 'g' : 'gi');
  } catch {
    throw new Error('The regular expression is not valid.');
  }
}

function looksBinary(buffer) {
  const sample = buffer.subarray(0, BINARY_SAMPLE_BYTES);
  if (sample.length === 0) return false;

  let suspicious = 0;
  for (const byte of sample) {
    if (byte === 0) return true;
    if (byte === 9 || byte === 10 || byte === 13) continue;
    if (byte < 7 || (byte > 13 && byte < 32)) suspicious += 1;
  }
  return suspicious / sample.length > 0.3;
}

function normalizeMaxHits(value) {
  const requested = Number(value);
  if (Number.isFinite(requested) && requested > 0) return Math.floor(requested);
  return DEFAULT_MAX_HITS;
}

function yieldToEventLoop() {
  return new Promise((resolve) => {
    setImmediate(resolve);
  });
}

function validateQuery(query) {
  if (!query || typeof query !== 'object') {
    throw new Error('The search query is not valid.');
  }
  if (typeof query.text !== 'string' || query.text.length === 0) {
    throw new Error('The search text must be a non-empty string.');
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

function searchLines(matcher, lineText, lineNumber, relPath, state) {
  const hits = [];
  matcher.lastIndex = 0;
  let match = matcher.exec(lineText);

  while (match) {
    const length = match[0].length;
    if (length === 0) {
      matcher.lastIndex += 1;
      if (matcher.lastIndex > lineText.length) break;
      match = matcher.exec(lineText);
      continue;
    }

    hits.push({
      relPath,
      line: lineNumber,
      column: match.index + 1,
      lineText,
      matchLength: length,
    });
    state.total += 1;

    if (state.total >= state.maxHits) break;
    match = matcher.exec(lineText);
  }

  return hits;
}

async function searchWorkspace(rootAbs, query, options = {}) {
  const normalized = validateQuery(query);
  const matcher = buildMatcher(normalized);
  const root = assertRoot(rootAbs);

  const maxHits = normalizeMaxHits(options.maxHits);
  const isCancelled = typeof options.isCancelled === 'function' ? options.isCancelled : () => false;
  const state = { total: 0, maxHits };
  const files = walkFiles(root);

  const groups = [];

  for (const relPath of files) {
    if (isCancelled() || state.total >= maxHits) break;

    let absolute;
    try {
      absolute = resolveInWorkspace(root, relPath);
    } catch {
      continue;
    }

    let buffer;
    try {
      buffer = await fs.promises.readFile(absolute);
    } catch {
      continue;
    }

    if (buffer.length === 0 || buffer.length > MAX_SEARCH_BYTES) continue;
    if (looksBinary(buffer)) continue;

    const text = buffer.toString('utf8');
    const lines = text.split(/\r\n|\r|\n/);
    const hits = [];

    for (let index = 0; index < lines.length; index += 1) {
      const lineHits = searchLines(matcher, lines[index], index + 1, relPath, state);
      if (lineHits.length > 0) hits.push(...lineHits);
      if (state.total >= maxHits) break;
    }

    if (hits.length > 0) groups.push({ relPath, hits });
    if (state.total >= maxHits) break;

    await yieldToEventLoop();
  }

  return groups;
}

module.exports = { searchWorkspace, escapeRegExp, DEFAULT_MAX_HITS };
