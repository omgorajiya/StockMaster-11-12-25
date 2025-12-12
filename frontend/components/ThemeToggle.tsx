'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 shadow-sm transition-all duration-200 hover:scale-105 hover:border-primary-200 hover:text-primary-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
      aria-label="Toggle color theme"
    >
      {isDark ? <Sun size={16} className="text-yellow-300" /> : <Moon size={16} className="text-blue-500" />}
      <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
    </button>
  );
}

