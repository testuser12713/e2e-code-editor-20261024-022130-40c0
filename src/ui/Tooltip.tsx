import { useId } from 'react';
import type { ReactNode } from 'react';

import { cn } from '../lib/cn';

export type TooltipProps = {
  label: string;
  children: ReactNode;
  className?: string;
  testId?: string;
};

export function Tooltip({ label, children, className, testId }: TooltipProps) {
  const tooltipId = useId();

  return (
    <span className={cn('ui-tooltip', className)} data-testid={testId}>
      {children}
      <span className="ui-tooltip-bubble" role="tooltip" id={tooltipId}>
        {label}
      </span>
    </span>
  );
}
