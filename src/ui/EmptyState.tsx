import type { ReactNode } from 'react';

import { cn } from '../lib/cn';
import { Icon, type IconName } from './Icon';

export type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: IconName;
  variant?: 'page' | 'inline';
  tone?: 'default' | 'danger' | 'accent';
  children?: ReactNode;
  className?: string;
  testId?: string;
};

export function EmptyState({
  title,
  description,
  icon,
  variant = 'page',
  tone = 'default',
  children,
  className,
  testId,
}: EmptyStateProps) {
  const iconClass = cn(
    'dialog-icon',
    tone === 'danger' ? 'is-danger' : tone === 'accent' ? 'is-accent' : undefined,
  );

  if (variant === 'inline') {
    return (
      <div className={cn('tree-empty', className)} data-testid={testId}>
        <p>{title}</p>
        {description ? <p className="muted">{description}</p> : null}
        {children}
      </div>
    );
  }

  return (
    <div className={cn('editor-empty', className)} data-testid={testId}>
      <div>
        {icon ? (
          <span className={cn(iconClass, 'empty-state-icon')}>
            <Icon name={icon} />
          </span>
        ) : null}
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
        {children ? <div className="welcome-actions">{children}</div> : null}
      </div>
    </div>
  );
}
