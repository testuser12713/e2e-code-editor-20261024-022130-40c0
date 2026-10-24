import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '../lib/cn';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'primary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children?: ReactNode;
  testId?: string;
};

const VARIANT_CLASS = {
  default: '',
  primary: 'btn-primary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
} as const;

const SIZE_CLASS = {
  sm: 'btn-sm',
  md: '',
  lg: 'btn-lg',
} as const;

export function Button({
  variant = 'default',
  size = 'md',
  className,
  type = 'button',
  testId,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn('btn', VARIANT_CLASS[variant], SIZE_CLASS[size], className)}
      data-testid={testId}
      {...props}
    />
  );
}
