'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/auth';
import Link from 'next/link';
import { CheckCircle, Eye, EyeOff, Shield } from 'lucide-react';
import { AuthTopBar } from '@/components/AuthTopBar';

const BENEFITS = [
  'Real-time visibility into stock and fulfillment',
  'Enforced approvals with full audit trail',
  'Barcode-native execution for zero-touch ops',
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authService.login(email, password);
      if (!remember) {
        localStorage.removeItem('refresh_token');
      }
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      // Handle different error formats
      const errorMessage = 
        err.response?.data?.error || 
        err.response?.data?.non_field_errors?.[0] ||
        err.response?.data?.email?.[0] ||
        err.response?.data?.password?.[0] ||
        err.message ||
        'Login failed. Please check your credentials and try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 flex items-center justify-center px-4 py-10">
      <AuthTopBar />
      <div className="w-full max-w-5xl grid gap-8 md:grid-cols-2">
        <div className="hidden md:flex flex-col justify-between rounded-3xl bg-primary-600 p-8 text-white shadow-2xl">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-sm font-semibold">
              <Shield size={16} /> Enterprise-grade security
            </div>
            <h2 className="mt-6 text-3xl font-bold leading-tight">
              StockMaster keeps your inventory trustworthy, auditable, and fast.
            </h2>
            <p className="mt-4 text-white/80">
              Unlock predictive replenishment, approval workflows, and seamless integrations the moment you
              sign in.
            </p>
          </div>
          <ul className="space-y-3 mt-8">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-center gap-3 text-lg">
                <CheckCircle size={20} className="text-emerald-300" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl bg-white dark:bg-slate-900 shadow-2xl p-6 sm:p-8">
          <div className="mb-6 sm:mb-8 text-center md:text-left">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Welcome back</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="font-semibold text-primary-600 hover:text-primary-500">
                Create one
              </Link>
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-transparent px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="name@company.com"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-transparent px-4 py-3 pr-12 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-500"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm">
              <label className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4 h-4"
                />
                Remember me
              </label>
              <Link href="/forgot-password" className="text-primary-600 hover:text-primary-500 font-medium text-sm sm:text-base">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-primary-600 px-6 py-3 text-white font-semibold hover:bg-primary-700 shadow-lg shadow-primary-600/30 transition-all disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

