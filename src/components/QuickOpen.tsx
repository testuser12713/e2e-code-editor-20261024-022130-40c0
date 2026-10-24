import { Palette } from '../ui/Palette';

export type QuickOpenProps = {
  open: boolean;
  onClose: () => void;
};

export function QuickOpen({ open, onClose }: QuickOpenProps) {
  return (
    <Palette
      open={open}
      label="Quick open"
      placeholder="Search files by name"
      icon="search"
      onClose={onClose}
      testId="quick-open"
      footer={<span>Fuzzy match across all files in the workspace</span>}
    >
      <div className="palette-empty">No workspace file matches that query.</div>
    </Palette>
  );
}
