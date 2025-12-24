'use client';

import * as React from 'react';
import { cn } from './cn';

const base =
  'w-full rounded-xl border bg-transparent px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 dark:text-gray-100';

const normal =
  'border-gray-200 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-700 dark:focus:border-primary-400 dark:focus:ring-primary-400';

const invalid =
  'border-danger-300 focus:border-danger-500 focus:ring-danger-500 dark:border-danger-700 dark:focus:border-danger-500 dark:focus:ring-danger-500';

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
>(({ className, invalid: isInvalid, ...props }, ref) => {
  return <input ref={ref} className={cn(base, isInvalid ? invalid : normal, className)} {...props} />;
});
Input.displayName = 'Input';

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }
>(({ className, invalid: isInvalid, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={cn(base, 'appearance-none pr-10', isInvalid ? invalid : normal, className)}
      {...props}
    />
  );
});
Select.displayName = 'Select';

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(({ className, invalid: isInvalid, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(base, 'min-h-[96px] resize-none', isInvalid ? invalid : normal, className)}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';
