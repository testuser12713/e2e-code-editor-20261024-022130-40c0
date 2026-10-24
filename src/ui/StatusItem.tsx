import type { ReactNode } from 'react';

export type StatusItemProps = {
  children: ReactNode;
  title?: string;
};

export function StatusItem({ children, title }: StatusItemProps) {
  return (
    <span className="status-item" title={title}>
      {children}
    </span>
  );
}
