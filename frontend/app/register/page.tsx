'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/auth';
import Link from 'next/link';
import { Activity, ShieldCheck } from 'lucide-react';
import { AuthTopBar } from '@/components/AuthTopBar';

const ROLES = [
  { value: 'inventory_manager', label: 'Inventory Manager' },
  { value: 'warehouse_staff', label: 'Warehouse Staff' },
  { value: 'admin', label: 'Admin' },
];

const strengthLabels = ['Weak', 'Okay', 'Fair', 'Good', 'Strong'];

const passwordScore = (password: string) => {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  if (password.length >= 12) score += 1;
  return score;
};

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    password_confirm: '',
    phone: '',
    role: 'warehouse_staff',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const strength = useMemo(() => passwordScore(formData.password), [formData.password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.password_confirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await authService.register(formData);
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Registration error:', err);
      // Handle different error formats
      const errorMessage = 
        err.response?.data?.error || 
        err.response?.data?.email?.[0] ||
        err.response?.data?.username?.[0] ||
        err.response?.data?.password?.[0] ||
        err.response?.data?.password_confirm?.[0] ||
        err.response?.data?.non_field_errors?.[0] ||
        err.message ||
        'Registration failed. Please check your input and try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <AuthTopBar />
      <div className="w-full max-w-5xl grid gap-8 md:grid-cols-2">
        <div className="rounded-3xl bg-white dark:bg-slate-900 shadow-2xl p-6 sm:p-8">
          <div className="mb-6 sm:mb-8 text-center md:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary-100 px-3 py-1 text-xs font-semibold text-primary-600">
              <ShieldCheck size={14} /> Seamless onboarding
            </div>
            <h1 className="mt-4 text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
              Create your StockMaster workspace
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Already collaborating?{' '}
              <Link href="/login" className="font-semibold text-primary-600 hover:text-primary-500">
                Sign in here
              </Link>
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Work email</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-1 w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-transparent px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Full name</label>
              <input
                type="text"
                required
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="mt-1 w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-transparent px-4 py-3 text-gray-900 dark:text-white focus:ring-primary-500"
                placeholder="Taylor Evans"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Phone (optional)</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="mt-1 w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-transparent px-4 py-3 text-gray-900 dark:text-white focus:ring-primary-500"
                placeholder="+1 555 123 4567"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="mt-1 w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-transparent px-4 py-3 text-gray-900 dark:text-white focus:ring-primary-500"
              >
                {ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Determines default permissions; fine-tune later under Settings → Users.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Password</label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="mt-1 w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-transparent px-4 py-3 text-gray-900 dark:text-white focus:ring-primary-500"
                placeholder="Minimum 8 characters"
              />
              <div className="mt-2 h-2 w-full rounded-full bg-gray-200 dark:bg-gray-800">
                <div
                  className={`h-full rounded-full ${
                    ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-emerald-500'][Math.min(
                      strength,
                      4,
                    )]
                  }`}
                  style={{ width: `${(Math.min(strength, 4) / 4) * 100}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Strength: {strengthLabels[Math.min(strength, strengthLabels.length - 1)]}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Confirm password</label>
              <input
                type="password"
                required
                value={formData.password_confirm}
                onChange={(e) => setFormData({ ...formData, password_confirm: e.target.value })}
                className="mt-1 w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-transparent px-4 py-3 text-gray-900 dark:text-white focus:ring-primary-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-primary-600 px-6 py-3 text-white font-semibold hover:bg-primary-700 shadow-lg shadow-primary-600/30 transition-all disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        </div>

        <div className="rounded-3xl bg-primary-50 dark:bg-slate-900/40 border border-primary-100 dark:border-slate-800 p-8 flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary-100 text-primary-700 px-3 py-1 text-xs font-semibold">
              <Activity size={14} /> Built for operations teams
            </div>
            <h2 className="mt-4 text-3xl font-bold text-primary-900 dark:text-white">
              Launch approvals, scanning, and replenishment workflows in one afternoon.
            </h2>
            <p className="mt-3 text-primary-900/70 dark:text-gray-200">
              After signup, invite teammates, set approval thresholds, and connect ERPs or storefronts with
              the Integrations console—no engineering sprint required.
            </p>
          </div>
          <ul className="space-y-3 text-primary-900/80 dark:text-gray-100 text-sm">
            <li>• Configure webhook connectors under Settings → Integrations.</li>
            <li>• Require approvals on receipts, transfers, adjustments, and returns.</li>
            <li>• Enable barcode scanners so floor teams move without manual SKU entry.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

