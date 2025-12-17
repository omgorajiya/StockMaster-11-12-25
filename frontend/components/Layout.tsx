'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { authService } from '@/lib/auth';
import {
  LayoutDashboard,
  Package,
  Receipt,
  Truck,
  ArrowLeftRight,
  Sliders,
  History,
  Settings,
  ClipboardList,
  User,
  LogOut,
  Menu,
  X,
  RotateCcw,
  GitMerge,
  Plug,
  ShieldCheck,
  Boxes,
} from 'lucide-react';
import NotificationBell from './NotificationBell';
import { ThemeToggle } from './ThemeToggle';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  // Track if component is mounted to prevent hydration mismatch
  const [mounted, setMounted] = useState(false);
  // Use ref to track if we've initialized to prevent re-initialization
  const initializedRef = useRef(false);
  // Use ref to lock sidebar state during navigation to prevent visual flicker
  const sidebarStateLockedRef = useRef(false);

  // IMPORTANT: keep initial state SSR-stable.
  // If we read window/localStorage in the initial render, the client can render a different icon
  // (<Menu> vs <X>) than the server did, triggering a hydration mismatch inside lucide-react.
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Initialize client-side state after mount to prevent hydration mismatch
  // This runs only once on mount and ensures state is synchronized
  useEffect(() => {
    if (typeof window === 'undefined' || initializedRef.current) return;

    initializedRef.current = true;

    const initialIsMobile = window.innerWidth < 1024;
    setIsMobile(initialIsMobile);

    const saved = localStorage.getItem('sidebarOpen');
    const nextSidebarOpen = saved !== null ? saved === 'true' : !initialIsMobile;
    setSidebarOpen(nextSidebarOpen);

    // Seed localStorage if there isn't a stored preference yet
    if (saved === null) {
      localStorage.setItem('sidebarOpen', String(nextSidebarOpen));
    }

    // Lock sidebar state after initialization to prevent changes during navigation
    sidebarStateLockedRef.current = true;
    setMounted(true);
  }, []);

  // Persist sidebar state to localStorage whenever it changes (user action only)
  // This ensures the sidebar state is saved when user manually toggles it
  // IMPORTANT: This should NOT trigger during navigation, only on manual toggle
  useEffect(() => {
    if (mounted && typeof window !== 'undefined' && !isMobile && initializedRef.current) {
      // Only save if we've initialized (prevents saving during initial mount)
      localStorage.setItem('sidebarOpen', String(sidebarOpen));
    }
  }, [sidebarOpen, mounted, isMobile]);

  // Restore sidebar scroll position ONLY on initial mount
  // Do NOT restore on pathname changes to prevent sidebar from jumping during navigation
  useEffect(() => {
    if (!mounted) return;
    
    const navElement = document.getElementById('sidebar-nav');
    if (navElement) {
      const savedScroll = sessionStorage.getItem('sidebarScrollPosition');
      if (savedScroll) {
        // Only restore once on mount, not on every navigation
        // This prevents the sidebar from jumping when clicking nav items
        navElement.scrollTop = parseInt(savedScroll, 10);
      }
    }
    // Note: We intentionally do NOT restore scroll on pathname changes
    // This prevents the sidebar from moving when switching between nav-bars
  }, [mounted]); // Only run once when mounted, NOT on pathname changes

  // Handle window resize - only update when actually switching between mobile/desktop
  // This should NOT interfere with navigation
  useEffect(() => {
    if (!mounted || typeof window === 'undefined' || !sidebarStateLockedRef.current) return;
    
    let previousIsMobile = window.innerWidth < 1024;
    let resizeTimeout: NodeJS.Timeout;
    
    const checkMobile = () => {
      // Only check if sidebar state is locked (initialized)
      if (!sidebarStateLockedRef.current) return;
      
      const isMobileWidth = window.innerWidth < 1024;
      
      // Only update if we're actually switching between mobile and desktop
      // This prevents unnecessary state updates during navigation
      if (isMobileWidth !== previousIsMobile) {
        setIsMobile(isMobileWidth);
        previousIsMobile = isMobileWidth;
        
        // Only auto-close on mobile, preserve user preference on desktop
        if (isMobileWidth) {
          // On mobile, close sidebar and mobile menu
          setSidebarOpen(false);
          setMobileMenuOpen(false);
        } else {
          // On desktop, restore saved preference or default to open
          // Don't change if user has manually set it
          const saved = localStorage.getItem('sidebarOpen');
          if (saved !== null) {
            setSidebarOpen(saved === 'true');
          } else {
            setSidebarOpen(true);
            localStorage.setItem('sidebarOpen', 'true');
          }
        }
      }
    };
    
    // Debounce resize handler to prevent excessive updates
    // Increased debounce time to prevent interference with navigation
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(checkMobile, 300);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, [mounted]);

  const handleLogout = async () => {
    await authService.logout();
    router.push('/login');
  };

  // Helper function to check if a route is active (handles nested routes)
  const isRouteActive = (href: string, currentPath: string) => {
    if (href === '/dashboard') {
      return currentPath === '/dashboard' || currentPath === '/';
    }
    if (href === '/settings') {
      // Settings is active for /settings and /settings/integrations
      return currentPath === '/settings' || currentPath.startsWith('/settings/');
    }
    // For other routes, check if pathname starts with href
    return currentPath === href || currentPath.startsWith(`${href}/`);
  };

  const menuItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { href: '/products', label: 'Products', icon: Package },
    { href: '/receipts', label: 'Receipts', icon: Receipt },
    { href: '/deliveries', label: 'Deliveries', icon: Truck },
    { href: '/transfers', label: 'Transfers', icon: ArrowLeftRight },
    { href: '/adjustments', label: 'Adjustments', icon: Sliders },
    { href: '/cycle-counts', label: 'Cycle Counts', icon: ClipboardList },
    { href: '/returns', label: 'Returns', icon: RotateCcw },
    { href: '/pick-waves', label: 'Pick Waves', icon: GitMerge },
    { href: '/suppliers', label: 'Suppliers', icon: Package },
    { href: '/storage', label: 'Storage', icon: Boxes },
    { href: '/analytics', label: 'Analytics', icon: LayoutDashboard },
    { href: '/history', label: 'Move History', icon: History },
    { href: '/audit-log', label: 'Audit Log', icon: ShieldCheck },
  ];

  return (
    <div className="flex h-screen bg-gray-100 text-gray-900 dark:bg-slate-950 dark:text-gray-100 overflow-hidden">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${
          // Width based ONLY on sidebarOpen state - never changes during navigation
          // This ensures sidebar stays in position when switching nav-bars
          sidebarOpen ? 'lg:w-64' : 'lg:w-16'
        } fixed lg:static inset-y-0 left-0 z-50 bg-white dark:bg-gray-900 shadow-lg flex flex-col border-r border-gray-100 dark:border-gray-800 w-64 ${
          // Only apply transition for mobile menu and manual toggle, not during navigation
          'transition-transform duration-300 lg:transition-[width] lg:duration-300'
        }`}
        style={{
          // Prevent any layout shifts during navigation
          contain: 'layout style',
        }}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
          {/* Always render both icon and text, but conditionally show/hide text to prevent hydration mismatch */}
          <Link 
            href="/dashboard"
            prefetch={true}
            className="flex items-center gap-2"
          >
            <LayoutDashboard className="text-primary-600 dark:text-primary-300 flex-shrink-0" size={24} />
            <span className={`text-xl font-bold text-primary-600 dark:text-primary-300 hover:text-primary-700 dark:hover:text-primary-200 transition-colors cursor-pointer ${
              mounted && (sidebarOpen || isMobile) ? 'block' : 'hidden'
            }`}>
              StockMaster
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (isMobile) {
                  setMobileMenuOpen(false);
                } else {
                  // User manually toggling - save preference
                  // Only allow toggle if sidebar state is not locked
                  if (sidebarStateLockedRef.current) {
                    const newState = !sidebarOpen;
                    setSidebarOpen(newState);
                    if (mounted && typeof window !== 'undefined') {
                      localStorage.setItem('sidebarOpen', String(newState));
                    }
                  }
                }
              }}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 hover:scale-105 active:scale-95 hidden lg:block"
              aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 lg:hidden"
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <nav 
          className="flex-1 overflow-y-auto p-4" 
          id="sidebar-nav"
          onScroll={(e) => {
            // Store scroll position in sessionStorage to preserve across navigation
            const target = e.currentTarget;
            sessionStorage.setItem('sidebarScrollPosition', String(target.scrollTop));
          }}
        >
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const IconComponent = item.icon;
              
              // Check if route is active (handles nested routes)
              // Only check pathname after mount to prevent hydration mismatch
              const isActive = mounted ? (item.exact 
                ? pathname === item.href || (item.href === '/dashboard' && pathname === '/')
                : isRouteActive(item.href, pathname)) : false;
              
              if (!IconComponent) return null;
              
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={(e) => {
                      // Only close mobile menu on mobile devices
                      // On desktop, sidebar should remain in its current state
                      if (isMobile) {
                        setMobileMenuOpen(false);
                      }
                      // Don't prevent default - let navigation happen
                      // Sidebar scroll position should NOT change during navigation
                    }}
                    onMouseDown={(e) => {
                      // Store current scroll position to preserve it
                      // This ensures scroll position is saved but NOT restored on navigation
                      const navElement = document.getElementById('sidebar-nav');
                      if (navElement) {
                        sessionStorage.setItem('sidebarScrollPosition', String(navElement.scrollTop));
                      }
                    }}
                    prefetch={true}
                    title={mounted && !sidebarOpen && !isMobile ? item.label : undefined}
                    className={`group flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${
                      mounted && !sidebarOpen && !isMobile ? 'justify-center' : ''
                    } ${
                      isActive
                        ? 'bg-primary-100 text-primary-700 shadow-sm ring-1 ring-primary-200 dark:bg-primary-900/40 dark:text-primary-200 dark:ring-primary-700'
                        : 'text-gray-700 hover:bg-primary-50 hover:text-primary-700 hover:shadow-sm dark:text-gray-300 dark:hover:bg-primary-900/40 dark:hover:text-primary-200'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                    aria-label={mounted && !sidebarOpen && !isMobile ? item.label : undefined}
                  >
                    <IconComponent
                      size={20}
                      className={`transition-transform duration-200 group-hover:scale-110 flex-shrink-0 ${
                        mounted && isActive ? 'text-primary-700 dark:text-primary-200' : ''
                      }`}
                      aria-hidden="true"
                    />
                    <span className={`font-medium ${
                      mounted && (sidebarOpen || isMobile) ? 'block' : 'hidden'
                    }`}>
                      {item.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t space-y-2">
          <Link
            href="/profile"
            onClick={() => {
              // Only close mobile menu on mobile devices
              // On desktop, sidebar should remain in its current state
              if (isMobile) {
                setMobileMenuOpen(false);
              }
            }}
            prefetch={true}
            title={mounted && !sidebarOpen && !isMobile ? 'My Profile' : undefined}
            aria-label={mounted && !sidebarOpen && !isMobile ? 'My Profile' : undefined}
            className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${
              mounted && !sidebarOpen && !isMobile ? 'justify-center' : ''
            } ${
              mounted && pathname === '/profile'
                ? 'bg-primary-100 text-primary-700 shadow-sm ring-1 ring-primary-200 dark:bg-primary-900/40 dark:text-primary-200 dark:ring-primary-700'
                : 'text-gray-700 hover:bg-gray-100 hover:text-primary-600 dark:text-gray-200 dark:hover:bg-gray-800 dark:hover:text-primary-300'
            }`}
          >
            <User size={20} />
            {mounted && (sidebarOpen || isMobile) && <span className="font-medium">My Profile</span>}
          </Link>
          <button
            onClick={handleLogout}
            title={mounted && !sidebarOpen && !isMobile ? 'Logout' : undefined}
            className={`flex items-center gap-3 p-3 rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-600 w-full text-left transition-all duration-200 dark:text-gray-200 dark:hover:bg-red-500/20 ${
              mounted && !sidebarOpen && !isMobile ? 'justify-center' : ''
            }`}
            aria-label="Logout"
          >
            <LogOut size={20} />
            {mounted && (sidebarOpen || isMobile) && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto w-full lg:w-auto">
        {/* Mobile Header with Menu Button */}
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-gray-800 px-4 lg:px-6 py-3 lg:py-4 flex justify-between lg:justify-end items-center gap-2 z-30">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {mounted && (
              <Link
                href="/settings"
                prefetch={true}
                title="Settings"
                className={`p-2 rounded-lg transition-all duration-200 ${
                  pathname === '/settings' || pathname.startsWith('/settings/')
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-200'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
                aria-label="Settings"
              >
                <Settings size={20} />
              </Link>
            )}
            <NotificationBell />
          </div>
        </div>
        <div className="p-4 sm:p-6 bg-gray-50 dark:bg-slate-950 min-h-full">{children}</div>
      </main>
    </div>
  );
}
