import type { ReactNode } from 'react';

import { cn } from '../lib/cn';

export type StatusItemProps = {
  children: ReactNode;
  title?: string;
  className?: string;
  testId?: string;
  dataState?: string;
};

export function StatusItem({ children, title, className, testId, dataState }: StatusItemProps) {
  return (
    <span
      className={cn('status-item', className)}
      title={title}
      data-testid={testId}
      data-state={dataState}
    >
      {children}
    </span>
  );
}
