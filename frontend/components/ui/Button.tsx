'use client';

import * as React from 'react';
import Link from 'next/link';
import { cn } from './cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'color'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export interface ButtonLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  prefetch?: boolean;
  title?: string;
  'aria-label'?: string;
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950';

const bySize: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
};

const byVariant: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg shadow-primary-600/30 hover:from-primary-700 hover:to-primary-800 hover:shadow-xl hover:shadow-primary-600/40',
  secondary:
    'bg-white text-gray-900 border border-gray-200 shadow-sm hover:bg-gray-50 dark:bg-slate-900 dark:text-gray-100 dark:border-gray-800 dark:hover:bg-slate-800',
  ghost:
    'bg-transparent text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800',
  danger:
    'bg-gradient-to-r from-danger-600 to-danger-700 text-white shadow-lg shadow-danger-600/25 hover:from-danger-700 hover:to-danger-800',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      leftIcon,
      rightIcon,
      children,
      type,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={type ?? 'button'}
        disabled={disabled || loading}
        className={cn(base, bySize[size], byVariant[variant], className)}
        {...props}
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
            <span className="text-sm">Loading…</span>
          </span>
        ) : (
          <>
            {leftIcon}
            {children}
            {rightIcon}
          </>
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';

export function ButtonLink({
  href,
  children,
  className,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  prefetch,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      prefetch={prefetch}
      className={cn(base, bySize[size], byVariant[variant], className)}
      {...rest}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </Link>
  );
}
