'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  BookOpen,
  Upload,
  History,
  Bell,
  User,
  LogOut,
  Menu,
  X,
  ExternalLink
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { useToast } from '@/components/toast-context';

let cachedAuthorUser: any = null;
let cachedAuthorUnread: number | null = null;

export default function AuthorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { showToast } = useToast();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(cachedAuthorUser);
  const [unreadCount, setUnreadCount] = useState<number>(cachedAuthorUnread || 0);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : {}))
      .then((data: any) => {
        if (data?.user) {
          cachedAuthorUser = data.user;
          setCurrentUser(data.user);
        }
      })
      .catch(() => {});

    const fetchNotifications = () => {
      fetch('/api/notifications')
        .then((res) => (res.ok ? res.json() : {}))
        .then((data: any) => {
          if (data?.unreadCount !== undefined) {
            cachedAuthorUnread = data.unreadCount;
            setUnreadCount(data.unreadCount);
          }
        })
        .catch(() => {});
    };

    fetchNotifications();

    window.addEventListener('notificationsUpdated', fetchNotifications);
    return () => window.removeEventListener('notificationsUpdated', fetchNotifications);
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    showToast('Logged out successfully', 'info');
    router.push('/login');
    router.refresh();
  };

  const navItems = [
    { name: 'Home', href: '/author', icon: Home },
    { name: 'My Books', href: '/author/books', icon: BookOpen },
    { name: 'Upload Files', href: '/author/upload', icon: Upload },
    { name: 'File History', href: '/author/history', icon: History },
    { name: 'Notifications', href: '/author/notifications', icon: Bell, badge: unreadCount },
    { name: 'Profile', href: '/author/profile', icon: User },
  ];

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 sticky top-0 h-screen z-30">
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Sadbhawana Publication Emblem"
            style={{ width: '48px', height: '48px' }}
            className="w-12 h-12 object-contain rounded-full border-2 border-amber-400/40 shadow-md shrink-0 hover:scale-105 transition-transform"
          />
          <div>
            <h2 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">SADBHAWANA</h2>
            <p className="text-[10px] font-bold tracking-widest text-indigo-600 dark:text-indigo-400 uppercase">AUTHOR PORTAL</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/author' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md glow-primary font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </div>
                {item.badge && item.badge > 0 ? (
                  <span className={`px-2 py-0.5 text-xs rounded-full font-bold ${isActive ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'}`}>
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        {/* If user is Admin, show Admin Switch */}
        {currentUser?.role === 'ADMIN' && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800">
            <Link
              href="/admin"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
            >
              <span>Return to Admin Console</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </Link>
          </div>
        )}

        {/* Author Footer User Pill */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100'}
              alt="Author"
              className="w-9 h-9 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
            />
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{currentUser?.fullName || 'Author'}</p>
              <p className="text-[10px] text-slate-400 font-mono truncate">@{currentUser?.username}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Log Out"
            className="p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Right Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-20 border-b border-slate-200 dark:border-slate-800 glass-header px-4 md:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
              Sadbhawana Author Workspace
            </span>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />

            {/* Notification Direct Bell */}
            <Link
              href="/author/notifications"
              className="relative p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Link>

            <Link
              href="/author/profile"
              className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-semibold transition-colors"
            >
              <img
                src={currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100'}
                alt="Avatar"
                className="w-6 h-6 rounded-lg object-cover"
              />
              <span className="hidden sm:inline text-slate-700 dark:text-slate-300">{currentUser?.fullName?.split(' ')[0] || 'Author'}</span>
            </Link>
          </div>
        </header>

        {/* Page Container */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 bg-white dark:bg-slate-900 h-full flex flex-col z-10 p-4 border-r border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="font-extrabold text-blue-600">AUTHOR PORTAL</div>
              <button onClick={() => setMobileOpen(false)} className="p-2 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 mt-4">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between p-3 rounded-xl text-sm font-medium ${
                    pathname === item.href ? 'bg-blue-600 text-white' : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </div>
                  {item.badge ? <span className="bg-blue-800 text-white px-2 py-0.5 text-xs rounded-full">{item.badge}</span> : null}
                </Link>
              ))}
            </nav>
            <button
              onClick={handleLogout}
              className="mt-auto p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 text-sm font-semibold flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" /> Log Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
