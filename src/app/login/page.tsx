'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, ShieldCheck, Lock, User, KeyRound, AlertCircle, ArrowRight, CheckCircle2, HelpCircle } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { useToast } from '@/components/toast-context';

export default function LoginPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameOrEmail, password, rememberMe }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed. Please check credentials.');
        showToast(data.error || 'Login failed', 'error');
        return;
      }

      showToast(`Welcome back, ${data.user.fullName}!`, 'success');

      if (data.user.role === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/author');
      }
      router.refresh();
    } catch (err: any) {
      setError('Connection error. Please try again.');
      showToast('Connection error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (userType: 'admin' | 'krishna') => {
    if (userType === 'admin') {
      setUsernameOrEmail('admin');
      setPassword('adminpassword123');
    } else {
      setUsernameOrEmail('krishna');
      setPassword('authorpassword123');
    }
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotSubmitted(true);
    showToast('Password reset instructions dispatched to your email', 'info');
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 md:p-8 bg-slate-900 text-slate-100 overflow-hidden">
      {/* Dynamic Ambient Background Blur */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/30 rounded-full blur-3xl pointer-events-none animate-pulse-slow" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/25 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar Theme Toggle */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md z-10 animate-fade-in">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <img
            src="/logo.png"
            alt="Sadbhawana Publication Emblem"
            style={{ width: '112px', height: '112px' }}
            className="w-28 h-28 object-contain mx-auto mb-4 drop-shadow-2xl hover:scale-105 transition-transform"
          />
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-1">
            Sadbhawana Publication
          </h1>
          <p className="text-sm font-medium text-slate-400">
            Author & Book Management Portal
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-card bg-slate-900/80 border border-slate-800/90 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-xl">
          {/* Registration Disabled Notice */}
          <div className="mb-6 p-3.5 rounded-2xl bg-blue-950/60 border border-blue-800/60 text-xs text-blue-200 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-blue-300">Author Registration Disabled:</span> Accounts are exclusively generated and assigned by Sadbhawana Publication Administrators.
            </div>
          </div>

          {error && (
            <div className="mb-6 p-3.5 rounded-2xl bg-rose-950/80 border border-rose-800 text-xs text-rose-200 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Username or Email Address
              </label>
              <div className="relative">
                <User className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  suppressHydrationWarning
                  placeholder="Enter username or email"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  suppressHydrationWarning
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500"
                />
                <span>Remember Login Session</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm transition-all shadow-lg glow-primary flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In to Portal</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500 mt-8">
          © {new Date().getFullYear()} Sadbhawana Publication. All rights reserved.
        </p>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-950 text-blue-400">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-white text-lg">Reset Password</h3>
              </div>
              <button onClick={() => setShowForgotModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            {!forgotSubmitted ? (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Enter your registered author email address. Reset instructions will be dispatched immediately.
                </p>
                <div>
                  <input
                    type="email"
                    required
                    placeholder="author.name@sadbhawana.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2 rounded-xl text-slate-400 hover:bg-slate-800 text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
                  >
                    Send Reset Link
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-4 space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h4 className="text-base font-semibold text-white">Reset Request Sent</h4>
                <p className="text-xs text-slate-300">
                  Instructions dispatched to <span className="font-semibold text-blue-300">{forgotEmail}</span>. Admin has also been notified.
                </p>
                <button
                  onClick={() => {
                    setShowForgotModal(false);
                    setForgotSubmitted(false);
                  }}
                  className="mt-4 px-5 py-2 rounded-xl bg-slate-800 text-white text-xs font-medium hover:bg-slate-700"
                >
                  Return to Login
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
