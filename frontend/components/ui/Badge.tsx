import * as React from 'react';
import { cn } from './cn';

type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

const styles: Record<BadgeVariant, string> = {
  neutral:
    'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700',
  success:
    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-700/50',
  warning:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700/50',
  danger:
    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-700/50',
  info:
    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-700/50',
};

export function Badge({
  variant = 'neutral',
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold',
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}
