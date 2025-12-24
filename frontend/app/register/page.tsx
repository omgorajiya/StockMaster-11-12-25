'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/auth';
import Link from 'next/link';
import { Activity, ShieldCheck, AlertTriangle, CheckCircle } from 'lucide-react';
import { AuthTopBar } from '@/components/AuthTopBar';


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
    invite_token: '',
    email: '',
    username: '',
    password: '',
    password_confirm: '',
    phone: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({
    email: '',
    username: '',
    password: '',
    password_confirm: '',
    phone: '',
  });

  const strength = useMemo(() => passwordScore(formData.password), [formData.password]);

  const validateField = (name: string, value: string) => {
    let error = '';
    
    switch (name) {
      case 'email':
        if (!value) {
          error = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          error = 'Please enter a valid email address';
        }
        break;
      case 'username':
        if (!value) {
          error = 'Name is required';
        } else if (value.length < 2) {
          error = 'Name must be at least 2 characters';
        }
        break;
      case 'password':
        if (!value) {
          error = 'Password is required';
        } else if (value.length < 8) {
          error = 'Password must be at least 8 characters';
        }
        break;
      case 'password_confirm':
        if (!value) {
          error = 'Please confirm your password';
        } else if (value !== formData.password) {
          error = 'Passwords do not match';
        }
        break;
      case 'phone':
        if (value && !/^\+?[\d\s-()]+$/.test(value)) {
          error = 'Please enter a valid phone number';
        }
        break;
    }
    
    setFieldErrors(prev => ({ ...prev, [name]: error }));
    return !error;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate all fields
    const isEmailValid = validateField('email', formData.email);
    const isUsernameValid = validateField('username', formData.username);
    const isPasswordValid = validateField('password', formData.password);
    const isPasswordConfirmValid = validateField('password_confirm', formData.password_confirm);
    const isPhoneValid = validateField('phone', formData.phone);

    if (!isEmailValid || !isUsernameValid || !isPasswordValid || !isPasswordConfirmValid || !isPhoneValid) {
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
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 py-12 px-4 sm:px-6 lg:px-8 animate-fade-in">
      <AuthTopBar />
      <div className="w-full max-w-6xl grid gap-6 md:gap-8 md:grid-cols-2">
        <div className="rounded-3xl bg-white dark:bg-slate-900 shadow-2xl p-6 sm:p-8 lg:p-10 hover-lift">
          <div className="mb-6 sm:mb-8 text-center md:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border-2 border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20 px-3 py-1.5 text-xs font-semibold text-primary-700 dark:text-primary-300">
              <ShieldCheck size={14} className="animate-pulse" /> Seamless onboarding
            </div>
            <h1 className="mt-4 text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 dark:text-white">
              Create your StockMaster workspace
            </h1>
            <p className="mt-3 text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Already collaborating?{' '}
              <Link href="/login" className="font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors duration-200 underline-offset-4 hover:underline">
                Sign in here
              </Link>
            </p>
          </div>

          <form className="space-y-4 sm:space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-red-700 dark:text-red-400 text-sm flex items-start gap-2 animate-scale-in">
                <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">Invite code (optional)</label>
              <input
                type="text"
                value={formData.invite_token}
                onChange={(e) => setFormData({ ...formData, invite_token: e.target.value })}
                className="mt-1 w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-transparent px-4 py-3 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-200"
                placeholder="Paste your invite code (if your org requires one)"
              />
              <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                Most companies use invite-only onboarding. If registration fails, ask your admin for an invite.
              </p>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">Work email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (fieldErrors.email) validateField('email', e.target.value);
                }}
                onBlur={(e) => validateField('email', e.target.value)}
                className={`mt-1 w-full rounded-2xl border ${fieldErrors.email ? 'border-red-300 dark:border-red-700 focus:ring-red-500' : 'border-gray-200 dark:border-gray-700 focus:ring-primary-500'} bg-transparent px-4 py-3 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all duration-200`}
                placeholder="you@company.com"
              />
              {fieldErrors.email && (
                <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1 animate-fade-in">
                  <AlertTriangle size={12} />
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">Full name *</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => {
                  setFormData({ ...formData, username: e.target.value });
                  if (fieldErrors.username) validateField('username', e.target.value);
                }}
                onBlur={(e) => validateField('username', e.target.value)}
                className={`mt-1 w-full rounded-2xl border ${fieldErrors.username ? 'border-red-300 dark:border-red-700 focus:ring-red-500' : 'border-gray-200 dark:border-gray-700 focus:ring-primary-500'} bg-transparent px-4 py-3 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all duration-200`}
                placeholder="Taylor Evans"
              />
              {fieldErrors.username && (
                <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1 animate-fade-in">
                  <AlertTriangle size={12} />
                  {fieldErrors.username}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">Phone (optional)</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => {
                  setFormData({ ...formData, phone: e.target.value });
                  if (fieldErrors.phone) validateField('phone', e.target.value);
                }}
                onBlur={(e) => validateField('phone', e.target.value)}
                className={`mt-1 w-full rounded-2xl border ${fieldErrors.phone ? 'border-red-300 dark:border-red-700 focus:ring-red-500' : 'border-gray-200 dark:border-gray-700 focus:ring-primary-500'} bg-transparent px-4 py-3 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all duration-200`}
                placeholder="+1 555 123 4567"
              />
              {fieldErrors.phone && (
                <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1 animate-fade-in">
                  <AlertTriangle size={12} />
                  {fieldErrors.phone}
                </p>
              )}
            </div>


            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">Password *</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value });
                  if (fieldErrors.password) validateField('password', e.target.value);
                }}
                onBlur={(e) => validateField('password', e.target.value)}
                className={`mt-1 w-full rounded-2xl border ${fieldErrors.password ? 'border-red-300 dark:border-red-700 focus:ring-red-500' : 'border-gray-200 dark:border-gray-700 focus:ring-primary-500'} bg-transparent px-4 py-3 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all duration-200`}
                placeholder="Minimum 8 characters"
              />
              <div className="mt-2 h-2 w-full rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-emerald-500'][Math.min(
                      strength,
                      4,
                    )]
                  }`}
                  style={{ width: `${(Math.min(strength, 4) / 4) * 100}%` }}
                />
              </div>
              <div className="mt-1.5 flex items-center justify-between">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Strength: <span className={`font-semibold ${
                    strength <= 1 ? 'text-red-600' : 
                    strength === 2 ? 'text-orange-600' : 
                    strength === 3 ? 'text-yellow-600' : 
                    'text-green-600'
                  }`}>
                    {strengthLabels[Math.min(strength, strengthLabels.length - 1)]}
                  </span>
                </p>
              </div>
              {fieldErrors.password && (
                <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1 animate-fade-in">
                  <AlertTriangle size={12} />
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">Confirm password *</label>
              <input
                type="password"
                value={formData.password_confirm}
                onChange={(e) => {
                  setFormData({ ...formData, password_confirm: e.target.value });
                  if (fieldErrors.password_confirm) validateField('password_confirm', e.target.value);
                }}
                onBlur={(e) => validateField('password_confirm', e.target.value)}
                className={`mt-1 w-full rounded-2xl border ${fieldErrors.password_confirm ? 'border-red-300 dark:border-red-700 focus:ring-red-500' : 'border-gray-200 dark:border-gray-700 focus:ring-primary-500'} bg-transparent px-4 py-3 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all duration-200`}
                placeholder="Confirm your password"
              />
              {fieldErrors.password_confirm && (
                <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1 animate-fade-in">
                  <AlertTriangle size={12} />
                  {fieldErrors.password_confirm}
                </p>
              )}
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
                    Creating account...
                  </>
                ) : (
                  'Create account'
                )}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-primary-400 to-primary-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            </button>
          </form>
        </div>

        <div className="rounded-3xl bg-gradient-to-br from-primary-50 via-blue-50 to-sky-50 dark:from-slate-900/40 dark:via-gray-900/40 dark:to-slate-900/40 border border-primary-100 dark:border-slate-800 p-8 lg:p-10 flex flex-col justify-between hover-lift">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary-200/60 dark:bg-primary-900/40 text-primary-800 dark:text-primary-300 px-4 py-2 text-xs font-semibold backdrop-blur-sm">
              <Activity size={14} className="animate-pulse" /> Built for operations teams
            </div>
            <h2 className="mt-6 text-2xl lg:text-3xl font-bold text-primary-900 dark:text-white">
              Launch approvals, scanning, and replenishment workflows in one afternoon.
            </h2>
            <p className="mt-4 text-base text-primary-900/70 dark:text-gray-300">
              After signup, invite teammates, set approval thresholds, and connect ERPs or storefronts with
              the Integrations console—no engineering sprint required.
            </p>
          </div>
          <ul className="space-y-3 mt-8 text-primary-900/80 dark:text-gray-100 text-sm">
            <li className="flex items-start gap-2">
              <CheckCircle size={16} className="text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0" />
              <span>Configure webhook connectors under Settings → Integrations.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle size={16} className="text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0" />
              <span>Require approvals on receipts, transfers, adjustments, and returns.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle size={16} className="text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0" />
              <span>Enable barcode scanners so floor teams move without manual SKU entry.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

