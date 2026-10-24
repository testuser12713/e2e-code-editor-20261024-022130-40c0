import { COMMAND_IDS, COMMAND_KEYBINDINGS } from '../commands/ids';
import { registerCommands } from '../commands/registry';
import { platform } from '../platform';
import { saveTab } from '../state/documents';
import { appStore } from '../state/store';
import type { PythonEvent } from '../state/types';
import {
  appendPythonLines,
  clearPythonOutput,
  setPythonInterpreter,
  setPythonRun,
  type PythonOutputLine,
  type PythonRun,
} from './pythonSession';

const STDIN_NOTICE = 'Standard input is not connected.';
const MISSING_INTERPRETER_NOTICE =
  'Python was not found on this system. Install Python 3 and make sure it is on your PATH.';
const NO_PROCESS_META = 'No process was started. The editor and completion remain available.';
const STOPPED_LINE = 'Process stopped by user';
const TIMEOUT_SECONDS = 60;

type OutputLine = Omit<PythonOutputLine, 'id'>;

let subscribed = false;
let pending = false;
let activeRunId: string | null = null;
let runRelPath: string | null = null;
let startedSeen = false;
let runClosed = false;
let missingInterpreter = false;
let attempt = 0;

function isPythonPath(relPath: string | null | undefined): boolean {
  return typeof relPath === 'string' && /\.py$/i.test(relPath);
}

function secondsFor(durationMs: number): string {
  const value = Number.isFinite(durationMs) ? Math.max(0, durationMs) : 0;
  return (value / 1000).toFixed(2);
}

function exitLine(code: number | null, durationMs: number): OutputLine {
  return {
    stream: code === 0 ? 'meta' : 'stderr',
    text: `Process exited with code ${code === null ? '?' : code} in ${secondsFor(durationMs)} s`,
    loc: null,
  };
}

function matchesRun(runId: string): boolean {
  return activeRunId === runId;
}

function handleEvent(event: PythonEvent): void {
  if (!event || typeof event !== 'object' || typeof event.runId !== 'string') return;

  if (event.kind === 'started') {
    if (activeRunId === null && !pending) return;
    if (activeRunId !== null && activeRunId !== event.runId) return;
    activeRunId = event.runId;
    startedSeen = true;
    setPythonInterpreter(event.interpreter);
    if (runRelPath) setPythonRun({ state: 'running', relPath: runRelPath });
    return;
  }

  if (!matchesRun(event.runId)) return;

  switch (event.kind) {
    case 'output':
      appendPythonLines([
        { stream: event.stream, text: event.text, loc: event.loc },
      ]);
      return;

    case 'notice':
      if (event.notice === 'stdin-eof') {
        appendPythonLines([{ stream: 'notice', text: STDIN_NOTICE, loc: null }]);
        return;
      }
      if (event.notice === 'interpreter-missing') {
        missingInterpreter = true;
        setPythonInterpreter({ found: false });
        appendPythonLines([
          { stream: 'notice', text: MISSING_INTERPRETER_NOTICE, loc: null },
          { stream: 'meta', text: NO_PROCESS_META, loc: null },
        ]);
      }
      return;

    case 'exit': {
      const relPath = runRelPath;
      if (!missingInterpreter) {
        if (event.reason === 'stopped') {
          appendPythonLines([{ stream: 'meta', text: STOPPED_LINE, loc: null }]);
        } else if (event.reason === 'timeout') {
          appendPythonLines([
            { stream: 'meta', text: `Process stopped after ${TIMEOUT_SECONDS} s`, loc: null },
          ]);
        } else {
          appendPythonLines([exitLine(event.code, event.durationMs)]);
        }
      }

      const run: PythonRun = relPath
        ? {
            state: 'finished',
            relPath,
            code: event.code,
            reason: event.reason,
          }
        : { state: 'idle' };
      setPythonRun(run);
      activeRunId = null;
      pending = false;
      runClosed = true;
      return;
    }

    default:
      return;
  }
}

function ensureSubscribed(): void {
  if (subscribed) return;
  subscribed = true;
  try {
    platform.python.onEvent(handleEvent);
  } catch {
    subscribed = false;
  }
}

export async function runActivePython(): Promise<void> {
  if (pending || activeRunId !== null) return;

  const state = appStore.getState();
  const tabId = state.tabs.activeId;
  const tab = tabId ? state.tabs.tabs.find((candidate) => candidate.id === tabId) : undefined;
  if (!tab || !isPythonPath(tab.relPath)) return;

  const attemptId = ++attempt;
  pending = true;
  missingInterpreter = false;
  startedSeen = false;
  runClosed = false;

  if (state.tabs.dirty[tab.id]) {
    const saved = await saveTab(tab.id);
    if (!saved) {
      pending = false;
      return;
    }
    if (attemptId !== attempt) return;
  }

  runRelPath = tab.relPath;
  activeRunId = null;
  clearPythonOutput();
  ensureSubscribed();

  let result;
  try {
    result = await platform.python.run(tab.relPath);
  } catch (error) {
    if (attemptId !== attempt) return;
    pending = false;
    activeRunId = null;
    appendPythonLines([
      {
        stream: 'stderr',
        text: error instanceof Error && error.message.length > 0
          ? error.message
          : 'Python could not be started.',
        loc: null,
      },
    ]);
    setPythonRun({ state: 'idle' });
    return;
  }

  if (attemptId !== attempt) return;
  pending = false;

  if (!result.ok) {
    appendPythonLines([{ stream: 'stderr', text: result.message, loc: null }]);
    activeRunId = null;
    setPythonRun({ state: 'idle' });
    return;
  }

  if (!startedSeen && !runClosed && activeRunId === null) {
    activeRunId = result.runId;
    setPythonRun({ state: 'running', relPath: tab.relPath });
  }
}

export async function stopPythonRun(): Promise<void> {
  const runId = activeRunId;
  if (runId === null) return;

  try {
    const result = await platform.python.stop(runId);
    if (!result.ok) {
      appendPythonLines([{ stream: 'stderr', text: result.message, loc: null }]);
    }
  } catch (error) {
    appendPythonLines([
      {
        stream: 'stderr',
        text: error instanceof Error && error.message.length > 0
          ? error.message
          : 'The Python process could not be stopped.',
        loc: null,
      },
    ]);
  }
}

registerCommands([
  {
    id: COMMAND_IDS.pythonRun,
    title: 'Python: Run file',
    keybinding: COMMAND_KEYBINDINGS[COMMAND_IDS.pythonRun],
    run: async () => {
      await runActivePython();
      return true;
    },
  },
]);
