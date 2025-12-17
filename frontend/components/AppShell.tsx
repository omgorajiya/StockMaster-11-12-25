'use client';

import { usePathname } from 'next/navigation';
import Layout from '@/components/Layout';

const NO_SHELL_ROUTES = new Set(['/login', '/register', '/forgot-password']);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Keep auth pages clean (no sidebar/top app chrome)
  if (NO_SHELL_ROUTES.has(pathname)) {
    return <>{children}</>;
  }

  return <Layout>{children}</Layout>;
}
