'use client';

import React, { useEffect, useState } from 'react';
import { Bell, CheckCheck, FileCheck, Trash2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/components/toast-context';

export default function AdminNotificationsPage() {
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch {
      showToast('Failed to load notifications', 'error');
    } finally {
      setLoading(false);
    }
  }

  const handleMarkAsRead = async (id: string, currentStatus: boolean) => {
    if (currentStatus) return; // Already read

    try {
      // Optimistic state update
      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, read: true } : item))
      );

      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      });

      if (res.ok) {
        window.dispatchEvent(new Event('notificationsUpdated'));
      }
    } catch {
      showToast('Failed to mark notification as read', 'error');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));

      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });

      if (res.ok) {
        showToast('All notifications marked as read', 'success');
        window.dispatchEvent(new Event('notificationsUpdated'));
      }
    } catch {
      showToast('Failed to update notifications', 'error');
    }
  };

  const handleDeleteNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Don't trigger card click

    try {
      setNotifications((prev) => prev.filter((item) => item.id !== id));

      const res = await fetch(`/api/notifications?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        showToast('Notification deleted', 'info');
        window.dispatchEvent(new Event('notificationsUpdated'));
      }
    } catch {
      showToast('Failed to delete notification', 'error');
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to delete all notifications?')) return;

    try {
      setNotifications([]);
      const res = await fetch('/api/notifications?clearAll=true', {
        method: 'DELETE',
      });

      if (res.ok) {
        showToast('All notifications cleared', 'info');
        window.dispatchEvent(new Event('notificationsUpdated'));
      }
    } catch {
      showToast('Failed to clear notifications', 'error');
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Bell className="w-7 h-7 text-indigo-600" /> Notifications Center
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold animate-pulse">
                {unreadCount} Unread
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-500">Realtime alerts for file reviews, book assignments, and system updates.</p>
        </div>

        {notifications.length > 0 && (
          <div className="flex items-center gap-2.5">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold transition-colors"
              >
                <CheckCheck className="w-4 h-4 text-indigo-600" /> Mark All as Read
              </button>
            )}
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/60 text-xs font-semibold transition-colors"
            >
              <Trash2 className="w-4 h-4" /> Clear All
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
          <Bell className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No notifications yet</h3>
          <p className="text-xs text-slate-500 mt-1">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleMarkAsRead(n.id, n.read)}
              className={`p-4 rounded-2xl border transition-all flex items-start gap-4 cursor-pointer group ${
                n.read
                  ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-75 hover:opacity-100 hover:border-slate-300 dark:hover:border-slate-700'
                  : 'bg-indigo-50/70 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800 shadow-sm hover:shadow-md'
              }`}
            >
              <div
                className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                  n.read
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    : 'bg-indigo-600 text-white shadow-md'
                }`}
              >
                {n.read ? <CheckCircle2 className="w-5 h-5" /> : <FileCheck className="w-5 h-5" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{n.title}</h4>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 shrink-0" />
                    )}
                  </div>
                  <span className="text-slate-400 font-mono text-[11px] shrink-0">
                    {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{n.message}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  type="button"
                  title="Delete notification"
                  onClick={(e) => handleDeleteNotification(e, n.id)}
                  className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/60 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
