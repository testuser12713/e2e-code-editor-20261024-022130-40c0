import { COMMAND_IDS, COMMAND_KEYBINDINGS } from '../commands/ids';
import { registerCommands } from '../commands/registry';
import { platform } from '../platform';
import { saveTab } from '../state/documents';
import { appStore } from '../state/store';
import type { PythonCheckResult } from '../state/types';
import {
  appendPythonLines,
  setPythonInterpreter,
  type PythonOutputLine,
} from './pythonSession';

const MISSING_INTERPRETER_NOTICE =
  'Python was not found on this system. Install Python 3 and make sure it is on your PATH.';
const NO_ARTEFACT_NOTE =
  'No files were executed and no __pycache__ or .pyc artefacts were written.';
const CHECK_FAILED_NOTICE = 'The syntax check could not start.';

const CHECK_SUCCESS_PATTERN = /^No syntax errors \(\d+ lines\)$/;
const CHECK_SUCCESS_DETAIL_PATTERN = /^Checked (.+) · line count \d+ · 0 errors$/;
const CHECK_ERROR_PATTERN = /, line \d+, column \d+: /;

type OutputLine = Omit<PythonOutputLine, 'id'>;

export type PythonCheckOutcome = 'passed' | 'syntax-error' | null;

function isPythonPath(relPath: string | null | undefined): boolean {
  return typeof relPath === 'string' && /\.py$/i.test(relPath);
}

function clampPositive(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : 1;
}

export function isPythonCheckSuccess(text: string): boolean {
  return CHECK_SUCCESS_PATTERN.test(text);
}

export function pythonCheckOutcome(
  lines: PythonOutputLine[],
  relPath?: string,
): PythonCheckOutcome {
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index];
    if (line.stream === 'meta' && isPythonCheckSuccess(line.text)) {
      const detail = lines[index + 1];
      const match = detail && detail.stream === 'meta'
        ? CHECK_SUCCESS_DETAIL_PATTERN.exec(detail.text)
        : null;
      if (relPath !== undefined && match !== null && match[1] !== relPath) return null;
      return 'passed';
    }
    if (line.stream === 'stderr' && line.loc !== null && CHECK_ERROR_PATTERN.test(line.text)) {
      if (relPath !== undefined && line.loc.relPath !== relPath) return null;
      return 'syntax-error';
    }
  }
  return null;
}

function successLines(relPath: string, lineCount: number): OutputLine[] {
  return [
    { stream: 'meta', text: `No syntax errors (${lineCount} lines)`, loc: null },
    { stream: 'meta', text: `Checked ${relPath} · line count ${lineCount} · 0 errors`, loc: null },
    { stream: 'meta', text: NO_ARTEFACT_NOTE, loc: null },
  ];
}

function sourceLine(line: number, sourceText: string): string {
  return `${String(line).padStart(5, ' ')} | ${sourceText}`;
}

function caretLine(column: number): string {
  return `${' '.repeat(5)} | ${' '.repeat(column - 1)}^`;
}

function syntaxErrorLines(
  relPath: string,
  result: Extract<PythonCheckResult, { kind: 'syntax' }>,
): OutputLine[] {
  const line = clampPositive(result.line);
  const column = clampPositive(result.column);
  const message = result.message.length > 0 ? result.message : 'invalid syntax';

  return [
    {
      stream: 'stderr',
      text: `${relPath}, line ${line}, column ${column}: ${message}`,
      loc: { relPath, line, column },
    },
    { stream: 'stderr', text: sourceLine(line, result.sourceText), loc: null },
    { stream: 'stderr', text: caretLine(column), loc: null },
    {
      stream: 'meta',
      text: `No syntax errors found before line ${line}. The file was not executed.`,
      loc: null,
    },
  ];
}

export async function checkActivePython(): Promise<void> {
  const state = appStore.getState();
  const tabId = state.tabs.activeId;
  const tab = tabId ? state.tabs.tabs.find((candidate) => candidate.id === tabId) : undefined;
  if (!tab || !isPythonPath(tab.relPath)) return;

  if (state.tabs.dirty[tab.id]) {
    const saved = await saveTab(tab.id);
    if (!saved) return;
  }

  let result: PythonCheckResult;
  try {
    result = await platform.python.check(tab.relPath);
  } catch (error) {
    appendPythonLines([
      {
        stream: 'stderr',
        text: error instanceof Error && error.message.length > 0
          ? error.message
          : CHECK_FAILED_NOTICE,
        loc: null,
      },
    ]);
    return;
  }

  if (result.ok) {
    const lineCount = Number.isFinite(result.lineCount)
      ? Math.max(0, Math.trunc(result.lineCount))
      : 0;
    appendPythonLines(successLines(tab.relPath, lineCount));
    return;
  }

  if (result.kind === 'syntax') {
    appendPythonLines(syntaxErrorLines(tab.relPath, result));
    return;
  }

  if (result.kind === 'interpreter-missing') {
    setPythonInterpreter({ found: false });
    appendPythonLines([{ stream: 'notice', text: MISSING_INTERPRETER_NOTICE, loc: null }]);
    return;
  }

  appendPythonLines([{ stream: 'stderr', text: result.message, loc: null }]);
}

registerCommands([
  {
    id: COMMAND_IDS.pythonCheck,
    title: 'Python: Check syntax',
    keybinding: COMMAND_KEYBINDINGS[COMMAND_IDS.pythonCheck],
    run: async () => {
      await checkActivePython();
      return true;
    },
  },
]);
