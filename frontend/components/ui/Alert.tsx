import * as React from 'react';
import { cn } from './cn';

type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

const styles: Record<AlertVariant, string> = {
  info: 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-100',
  success:
    'border-green-200 bg-green-50 text-green-900 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-100',
  warning:
    'border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-900/50 dark:bg-yellow-900/20 dark:text-yellow-100',
  danger:
    'border-red-200 bg-red-50 text-red-900 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-100',
};

export function Alert({
  variant = 'info',
  title,
  description,
  icon,
  className,
}: {
  variant?: AlertVariant;
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-xl border px-4 py-3 text-sm', styles[variant], className)}>
      <div className="flex items-start gap-2">
        {icon ? <div className="mt-0.5 flex-shrink-0">{icon}</div> : null}
        <div className="min-w-0">
          {title ? <div className="font-semibold">{title}</div> : null}
          {description ? <div className="mt-0.5 text-sm opacity-90">{description}</div> : null}
        </div>
      </div>
    </div>
  );
}
