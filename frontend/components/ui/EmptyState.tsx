import * as React from 'react';
import { cn } from './cn';

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 px-6 py-10 text-center dark:border-gray-800 dark:bg-gray-900/20', className)}>
      {icon ? <div className="rounded-full bg-white p-4 shadow-sm dark:bg-gray-900">{icon}</div> : null}
      <div>
        <div className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</div>
        {description ? <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">{description}</div> : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
