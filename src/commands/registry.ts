export type Command = {
  id: string;
  title: string;
  keybinding?: string;
  run: (args?: unknown) => Promise<boolean> | boolean | void;
};

const commands = new Map<string, Command>();

export function registerCommands(nextCommands: Command[]): void {
  for (const command of nextCommands) {
    commands.set(command.id, command);
  }
}

export function getCommands(): Command[] {
  return Array.from(commands.values());
}

export function hasCommand(id: string): boolean {
  return commands.has(id);
}

export async function runCommand(id: string, args?: unknown): Promise<boolean> {
  const command = commands.get(id);
  if (!command) return false;

  try {
    const result = await command.run(args);
    return result === undefined ? true : Boolean(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Command "${id}" failed: ${message}`);
    return false;
  }
}
