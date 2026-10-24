import { useSyncExternalStore } from 'react';

import type { PythonInterpreter, PythonLocation } from '../state/types';

export type PythonStream = 'stdout' | 'stderr' | 'meta' | 'notice';

export type PythonOutputLine = {
  id: number;
  stream: PythonStream;
  text: string;
  loc: PythonLocation | null;
};

export type PythonRun =
  | { state: 'idle' }
  | { state: 'running'; relPath: string }
  | {
      state: 'finished';
      relPath: string;
      code: number | null;
      reason: 'exit' | 'stopped' | 'timeout';
    };

export type PythonSessionState = {
  lines: PythonOutputLine[];
  run: PythonRun;
  interpreter: PythonInterpreter | null;
};

export const PYTHON_MAX_LINES = 5000;

type Listener = () => void;

let state: PythonSessionState = {
  lines: [],
  run: { state: 'idle' },
  interpreter: null,
};
let nextLineId = 1;
const listeners = new Set<Listener>();

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): PythonSessionState {
  return state;
}

export function appendPythonLines(lines: Omit<PythonOutputLine, 'id'>[]): void {
  if (lines.length === 0) return;

  const appended = lines.map((line) => ({ ...line, id: nextLineId++ }));
  const combined = state.lines.concat(appended);
  const trimmed =
    combined.length > PYTHON_MAX_LINES
      ? combined.slice(combined.length - PYTHON_MAX_LINES)
      : combined;

  state = { ...state, lines: trimmed };
  emit();
}

export function clearPythonOutput(): void {
  if (state.lines.length === 0) return;
  state = { ...state, lines: [] };
  emit();
}

export function setPythonRun(run: PythonRun): void {
  state = { ...state, run };
  emit();
}

export function setPythonInterpreter(info: PythonInterpreter | null): void {
  state = { ...state, interpreter: info };
  emit();
}

export function usePythonSession(): PythonSessionState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
