import type { PythonCompletionSource } from './completionData';

export const staticCompletionSource: PythonCompletionSource = {
  id: 'static',
  itemsFor: () => [],
};
