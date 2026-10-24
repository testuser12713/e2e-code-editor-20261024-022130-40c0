import type { EditorApi } from './types';

let editorApi: EditorApi | null = null;

export type { EditorApi };

export function registerEditorApi(api: EditorApi): void {
  editorApi = api;
}

export function getEditorApi(): EditorApi | null {
  return editorApi;
}

export async function openFile(
  relPath: string,
  position?: { line: number; column: number },
): Promise<boolean> {
  void relPath;
  void position;
  return false;
}

export async function saveTab(tabId: string): Promise<boolean> {
  void tabId;
  return false;
}

export async function saveActive(): Promise<boolean> {
  return false;
}

export async function saveAll(): Promise<boolean> {
  return false;
}

export function closeTabById(tabId: string): void {
  void tabId;
}

export function closeTabByPath(relPath: string): void {
  void relPath;
}

export function setActiveLanguage(languageId: string): void {
  void languageId;
}
