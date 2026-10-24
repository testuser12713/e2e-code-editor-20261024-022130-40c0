import { useSyncExternalStore } from 'react';

import {
  getClosePromptSnapshot,
  resolveClosePrompt,
  subscribeClosePrompt,
} from '../state/closeFlow';
import { ClosePromptDialog } from './ClosePromptDialog';

export function CloseGuard() {
  const prompt = useSyncExternalStore(
    subscribeClosePrompt,
    getClosePromptSnapshot,
    getClosePromptSnapshot,
  );

  return (
    <ClosePromptDialog
      open={prompt.open}
      fileName={prompt.name ?? undefined}
      relPath={prompt.relPath ?? undefined}
      onSave={() => resolveClosePrompt('save')}
      onDiscard={() => resolveClosePrompt('discard')}
      onCancel={() => resolveClosePrompt('cancel')}
    />
  );
}
