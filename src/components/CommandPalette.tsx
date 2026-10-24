import { Palette } from '../ui/Palette';

export type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
};

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  return (
    <Palette
      open={open}
      label="Command palette"
      placeholder="Type a command"
      icon="command"
      onClose={onClose}
      testId="command-palette"
      footer={<span>Fuzzy filtered commands</span>}
    >
      <div className="palette-empty">No command matches that query.</div>
    </Palette>
  );
}
