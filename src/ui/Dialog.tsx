import { useEffect, useId } from 'react';
import type { ReactNode } from 'react';

import { cn } from '../lib/cn';
import { Icon, type IconName } from './Icon';

export type DialogProps = {
  open: boolean;
  title: string;
  subtitle?: ReactNode;
  description?: ReactNode;
  icon?: IconName;
  iconTone?: 'default' | 'danger' | 'accent';
  role?: 'dialog' | 'alertdialog';
  contained?: boolean;
  children?: ReactNode;
  footer?: ReactNode;
  onClose?: () => void;
  testId?: string;
};

export function Dialog({
  open,
  title,
  subtitle,
  description,
  icon,
  iconTone = 'default',
  role = 'dialog',
  contained = false,
  children,
  footer,
  onClose,
  testId,
}: DialogProps) {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onClose?.();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const iconClass = iconTone === 'danger' ? 'is-danger' : iconTone === 'accent' ? 'is-accent' : undefined;

  return (
    <div
      className={cn('dialog-backdrop', contained ? 'is-contained' : undefined)}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        className="dialog"
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        data-testid={testId}
      >
        <div className="dialog-head">
          <span className={cn('dialog-icon', iconClass)}>
            <Icon name={icon ?? 'info'} />
          </span>
          <div>
            <h2 id={titleId}>{title}</h2>
            {subtitle ? <span className="hint">{subtitle}</span> : null}
          </div>
        </div>
        {description ? (
          <div className="dialog-copy" id={descriptionId}>
            {description}
          </div>
        ) : null}
        {children ? <div className="dialog-body">{children}</div> : null}
        {footer ? <div className="dialog-actions">{footer}</div> : null}
      </div>
    </div>
  );
}
