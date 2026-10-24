import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '../lib/cn';

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  size?: 'sm' | 'md';
  children: ReactNode;
  testId?: string;
};

export function IconButton({
  label,
  size = 'md',
  className,
  type = 'button',
  testId,
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={cn('icon-btn', size === 'sm' ? 'icon-btn-sm' : undefined, className)}
      title={props.title ?? label}
      aria-label={label}
      data-testid={testId}
      {...props}
    >
      {children}
    </button>
  );
}
