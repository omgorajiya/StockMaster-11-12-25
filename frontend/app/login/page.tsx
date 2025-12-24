'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/auth';
import Link from 'next/link';
import { CheckCircle, Eye, EyeOff, Shield, AlertTriangle } from 'lucide-react';
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
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const validateEmail = (value: string) => {
    if (!value) {
      setEmailError('Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  const validatePassword = (value: string) => {
    if (!value) {
      setPasswordError('Password is required');
      return false;
    }
    if (value.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    
    if (!isEmailValid || !isPasswordValid) {
      return;
    }

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
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 flex items-center justify-center px-4 py-10 animate-fade-in">
      <AuthTopBar />
      <div className="w-full max-w-6xl grid gap-6 md:gap-8 md:grid-cols-2">
        <div className="hidden md:flex flex-col justify-between rounded-3xl bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 p-8 lg:p-10 text-white shadow-2xl hover-lift overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-4 py-2 text-sm font-semibold shadow-lg">
              <Shield size={16} className="animate-pulse" /> Enterprise-grade security
            </div>
            <h2 className="mt-6 text-3xl lg:text-4xl font-bold leading-tight">
              StockMaster keeps your inventory trustworthy, auditable, and fast.
            </h2>
            <p className="mt-4 text-lg text-white/90">
              Unlock predictive replenishment, approval workflows, and seamless integrations the moment you
              sign in.
            </p>
          </div>
          <ul className="space-y-4 mt-8 relative z-10">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-center gap-3 text-base lg:text-lg group">
                <div className="p-1 bg-white/20 rounded-full group-hover:bg-white/30 transition-colors duration-200">
                  <CheckCircle size={20} className="text-emerald-300" />
                </div>
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl bg-white dark:bg-slate-900 shadow-2xl p-6 sm:p-8 lg:p-10 hover-lift">
          <div className="mb-6 sm:mb-8 text-center md:text-left">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">Welcome back</h1>
            <p className="mt-3 text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors duration-200 underline-offset-4 hover:underline">
                Create one
              </Link>
            </p>
          </div>

          <form className="space-y-5 sm:space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-red-700 dark:text-red-400 text-sm flex items-start gap-2 animate-scale-in">
                <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) validateEmail(e.target.value);
                }}
                onBlur={(e) => validateEmail(e.target.value)}
                className={`w-full rounded-2xl border ${emailError ? 'border-red-300 dark:border-red-700 focus:ring-red-500' : 'border-gray-200 dark:border-gray-700 focus:ring-primary-500'} bg-transparent px-4 py-3 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all duration-200`}
                placeholder="name@company.com"
              />
              {emailError && (
                <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 animate-fade-in">
                  <AlertTriangle size={12} />
                  {emailError}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) validatePassword(e.target.value);
                  }}
                  onBlur={(e) => validatePassword(e.target.value)}
                  className={`w-full rounded-2xl border ${passwordError ? 'border-red-300 dark:border-red-700 focus:ring-red-500' : 'border-gray-200 dark:border-gray-700 focus:ring-primary-500'} bg-transparent px-4 py-3 pr-12 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all duration-200`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {passwordError && (
                <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 animate-fade-in">
                  <AlertTriangle size={12} />
                  {passwordError}
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm">
              <label className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-300 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4 h-4 cursor-pointer"
                />
                <span className="group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors duration-200">Remember me</span>
              </label>
              <Link href="/forgot-password" className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium text-sm sm:text-base transition-all duration-200 hover:scale-105 active:scale-95 underline-offset-4 hover:underline">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 px-6 py-3.5 text-white font-semibold shadow-lg shadow-primary-600/40 hover:shadow-xl hover:shadow-primary-600/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden group"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-primary-400 to-primary-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

