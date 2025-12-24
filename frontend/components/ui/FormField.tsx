'use client';

import * as React from 'react';
import type { FieldError } from 'react-hook-form';
import { cn } from './cn';

export function FieldLabel({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn('block text-sm font-semibold text-gray-700 dark:text-gray-200', className)}
      {...props}
    />
  );
}

export function FieldHint({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('mt-1 text-xs text-gray-500 dark:text-gray-400', className)} {...props} />
  );
}

export function FieldErrorText({
  error,
  className,
}: {
  error?: FieldError | string;
  className?: string;
}) {
  if (!error) return null;
  const message = typeof error === 'string' ? error : error.message;
  if (!message) return null;
  return (
    <p className={cn('mt-1 text-xs text-danger-600 dark:text-danger-300', className)}>
      {message}
    </p>
  );
}
