import { useId } from 'react';
import type { ReactNode } from 'react';

import { cn } from '../lib/cn';
import { Icon, type IconName } from './Icon';

export type DialogProps = {
  open: boolean;
  title: string;
  description?: ReactNode;
  icon?: IconName;
  iconTone?: 'default' | 'danger' | 'accent';
  role?: 'dialog' | 'alertdialog';
  children?: ReactNode;
  footer?: ReactNode;
  onClose?: () => void;
  testId?: string;
};

export function Dialog({
  open,
  title,
  description,
  icon,
  iconTone = 'default',
  role = 'dialog',
  children,
  footer,
  onClose,
  testId,
}: DialogProps) {
  const titleId = useId();

  if (!open) return null;

  const iconClass = iconTone === 'danger' ? 'is-danger' : iconTone === 'accent' ? 'is-accent' : undefined;

  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        className="dialog"
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid={testId}
      >
        <div className="dialog-head">
          <span className={cn('dialog-icon', iconClass)}>
            <Icon name={icon ?? 'info'} />
          </span>
          <div>
            <h2 id={titleId}>{title}</h2>
          </div>
        </div>
        {description ? <div className="dialog-copy">{description}</div> : null}
        {children ? <div className="dialog-body">{children}</div> : null}
        {footer ? <div className="dialog-actions">{footer}</div> : null}
      </div>
    </div>
  );
}
