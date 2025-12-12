'use client';

import { Bell } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

export function AuthTopBar() {
  return (
    <div className="absolute top-4 right-4 flex items-center gap-3 z-10">
      <ThemeToggle />
      <div
        className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-500 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
        title="Alerts become available after you sign in"
        aria-disabled="true"
      >
        <Bell size={16} className="text-gray-400 dark:text-gray-500" />
        <span className="text-xs uppercase tracking-wide">Alerts</span>
      </div>
    </div>
  );
}


