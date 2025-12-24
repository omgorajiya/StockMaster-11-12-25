'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, Check, Clock } from 'lucide-react';
import { api } from '@/lib/api';

interface Notification {
  id: number;
  title: string;
  message: string;
  notification_type: string;
  priority: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    // Move focus into the panel for keyboard users.
    // We use a microtask to ensure the panel is mounted.
    queueMicrotask(() => {
      panelRef.current?.focus();
    });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/notifications/notifications/');
      setNotifications(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/notifications/notifications/unread_count/');
      setUnreadCount(response.data.count || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await api.post(`/notifications/notifications/${id}/mark_read/`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/notifications/mark_all_read/');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            fetchNotifications();
          }
        }}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300 hover:scale-110 active:scale-95 group"
        aria-label="Notifications"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <Bell size={20} className="text-gray-700 dark:text-gray-300 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-200" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse shadow-lg shadow-red-500/50">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsOpen(false)}
          />
          <div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-label="Notifications"
            className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl z-50 border border-gray-200 dark:border-gray-700 animate-scale-in overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-primary-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Bell size={20} className="text-primary-600 dark:text-primary-400" />
                <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-semibold bg-red-500 text-white rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs sm:text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 mb-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-600 border-t-transparent"></div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Loading notifications...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-3">
                    <Bell size={32} className="text-gray-400 dark:text-gray-500" />
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">You&apos;re all caught up!</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">No new notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 cursor-pointer ${
                        !notification.is_read ? 'bg-blue-50/50 dark:bg-blue-900/20 border-l-4 border-l-blue-500' : ''
                      }`}
                      onClick={() => !notification.is_read && markAsRead(notification.id)}
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span
                              className={`px-2 py-0.5 text-[10px] sm:text-xs font-semibold rounded-full border ${getPriorityColor(
                                notification.priority
                              )}`}
                            >
                              {notification.priority}
                            </span>
                            {!notification.is_read && (
                              <span className="flex items-center gap-1 text-[10px] sm:text-xs font-medium text-blue-600 dark:text-blue-400">
                                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                New
                              </span>
                            )}
                          </div>
                          <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-1 truncate">{notification.title}</h4>
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{notification.message}</p>
                          <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 mt-2 flex items-center gap-1">
                            <Clock size={12} />
                            {new Date(notification.created_at).toLocaleString()}
                          </p>
                        </div>
                        {!notification.is_read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95 flex-shrink-0"
                            title="Mark as read"
                          >
                            <Check size={14} className="text-gray-600 dark:text-gray-400" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

