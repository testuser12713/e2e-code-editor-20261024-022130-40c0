import type { ReactNode } from 'react';

import { cn } from '../lib/cn';

export type StatusItemProps = {
  children: ReactNode;
  title?: string;
  className?: string;
  testId?: string;
};

export function StatusItem({ children, title, className, testId }: StatusItemProps) {
  return (
    <span className={cn('status-item', className)} title={title} data-testid={testId}>
      {children}
    </span>
  );
}
