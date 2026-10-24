import { COMMAND_KEYBINDINGS } from './ids';
import { runCommand } from './registry';

function eventToKeybinding(event: KeyboardEvent): string | null {
  const key = event.key;
  if (key === 'Control' || key === 'Shift' || key === 'Alt' || key === 'Meta') return null;

  const parts: string[] = [];
  if (event.ctrlKey || event.metaKey) parts.push('Ctrl');
  if (event.altKey) parts.push('Alt');
  if (event.shiftKey) parts.push('Shift');
  if (parts.length === 0) return null;

  let normalized = key;
  if (key.length === 1) normalized = key.toUpperCase();
  if (key === ' ') normalized = 'Space';
  parts.push(normalized);
  return parts.join('+');
}

export function installKeymap(target: Window = window): () => void {
  const listener = (event: KeyboardEvent) => {
    if (event.defaultPrevented) return;
    const binding = eventToKeybinding(event);
    if (!binding) return;

    for (const [commandId, keybinding] of Object.entries(COMMAND_KEYBINDINGS)) {
      if (keybinding !== binding) continue;
      event.preventDefault();
      void runCommand(commandId);
      return;
    }
  };

  target.addEventListener('keydown', listener);
  return () => target.removeEventListener('keydown', listener);
}
