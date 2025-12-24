import * as React from 'react';
import { cn } from './cn';

export function LoadingState({
  label = 'Loading…',
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600 dark:border-primary-900/30 dark:border-t-primary-400" />
      <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">{label}</p>
    </div>
  );
}
