import { ClosePromptDialog } from './ClosePromptDialog';

export function CloseGuard() {
  return (
    <ClosePromptDialog
      open={false}
      onSave={() => undefined}
      onDiscard={() => undefined}
      onCancel={() => undefined}
    />
  );
}
