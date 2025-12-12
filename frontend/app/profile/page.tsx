'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { authService, User } from '@/lib/auth';
import { ShieldCheck, Mail, UserCircle2, Clock, ArrowRight } from 'lucide-react';

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const userData = await authService.getProfile();
      setUser(userData);
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <UserCircle2 size={30} className="text-primary-600" />
              My Profile
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Personal details and access for your StockMaster account.
            </p>
          </div>
        </div>

        {user && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Identity card */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow p-6 space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-600 text-white text-xl font-semibold">
                  {(user.first_name || user.username || user.email || 'U')
                    .charAt(0)
                    .toUpperCase()}
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900">
                    {user.first_name || user.last_name
                      ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                      : user.username || user.email}
                  </p>
                  <p className="flex items-center gap-1 text-xs text-gray-500">
                    <ShieldCheck size={14} className="text-emerald-500" />
                    <span className="uppercase tracking-wide">
                      {user.role || 'User'}
                    </span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 text-sm">
                <div>
                  <p className="text-gray-500 flex items-center gap-1">
                    <Mail size={14} /> Email
                  </p>
                  <p className="font-medium text-gray-900 break-all">{user.email}</p>
                </div>
                <div>
                  <p className="text-gray-500">Username</p>
                  <p className="font-medium text-gray-900">{user.username}</p>
                </div>
                <div>
                  <p className="text-gray-500">First name</p>
                  <p className="font-medium text-gray-900">
                    {user.first_name || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Last name</p>
                  <p className="font-medium text-gray-900">
                    {user.last_name || '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Security / session hints */}
            <div className="bg-white rounded-xl shadow p-6 space-y-4">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <ShieldCheck size={18} className="text-primary-600" />
                Security & session
              </h2>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Clock size={14} />
                Changes to your role and permissions are managed by an administrator.
              </p>
              <div className="space-y-2 text-xs text-gray-600">
                <p>• Use a strong, unique password for this account.</p>
                <p>• Always sign out on shared devices.</p>
              </div>
              <Link
                href="/settings"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
              >
                Go to settings
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

