import type { ReactNode } from 'react';

export type EmptyStateProps = {
  title: string;
  description?: string;
  children?: ReactNode;
};

export function EmptyState({ title, description, children }: EmptyStateProps) {
  return (
    <div className="editor-empty">
      <div>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
        {children ? <div className="welcome-actions">{children}</div> : null}
      </div>
    </div>
  );
}
