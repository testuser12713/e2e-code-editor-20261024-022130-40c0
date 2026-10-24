import type { PythonCompletionSource } from './completionData';

export const documentCompletionSource: PythonCompletionSource = {
  id: 'document-symbols',
  itemsFor: () => [],
};
