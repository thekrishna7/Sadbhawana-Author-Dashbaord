'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  Plus,
  UserPlus,
  Upload,
  ArrowUpRight,
  History,
  Bell,
  FileText,
  FileCheck
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalBooks: 0,
    totalAuthors: 0,
    pendingReviews: 0,
    approvedFiles: 0,
    changesRequested: 0,
    storageUsedMb: 0,
  });

  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [booksRes, authorsRes, filesRes, activityRes, notifRes] = await Promise.all([
          fetch('/api/books').then((r) => r.json()),
          fetch('/api/authors').then((r) => r.json()),
          fetch('/api/files').then((r) => r.json()),
          fetch('/api/activity').then((r) => r.json()),
          fetch('/api/notifications').then((r) => r.json()),
        ]);

        const books = booksRes.books || [];
        const authors = authorsRes.authors || [];
        const files = filesRes.files || [];

        const pending = files.filter((f: any) => f.status === 'SUBMITTED' || f.status === 'UNDER_REVIEW').length;
        const approved = files.filter((f: any) => f.status === 'APPROVED').length;
        const changes = files.filter((f: any) => f.status === 'CHANGES_REQUESTED').length;
        const totalSize = files.reduce((acc: number, f: any) => acc + (f.fileSize || 0), 0);

        setStats({
          totalBooks: books.length,
          totalAuthors: authors.length,
          pendingReviews: pending,
          approvedFiles: approved,
          changesRequested: changes,
          storageUsedMb: (totalSize / (1024 * 1024)).toFixed(1) as any,
        });

        setRecentActivities((activityRes.logs || []).slice(0, 5));
        setRecentNotifications((notifRes.notifications || []).slice(0, 5));
      } catch (err) {
        console.error('Failed loading stats:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const pieData = [
    { name: 'Approved', value: Number(stats.approvedFiles) || 1, color: '#10b981' },
    { name: 'Pending Review', value: Number(stats.pendingReviews) || 1, color: '#3b82f6' },
    { name: 'Changes Requested', value: Number(stats.changesRequested) || 1, color: '#f59e0b' },
  ];

  const barData = [
    { name: 'Mon', files: 4 },
    { name: 'Tue', files: 7 },
    { name: 'Wed', files: 5 },
    { name: 'Thu', files: 12 },
    { name: 'Fri', files: 9 },
    { name: 'Sat', files: 3 },
    { name: 'Sun', files: 6 },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
        <div>
          <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold uppercase tracking-wider">
            Sadbhawana Control Desk
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-2">Executive Publication Dashboard</h1>
          <p className="text-sm text-slate-300 mt-1 max-w-xl">
            Realtime monitoring of authors, manuscript revisions, ISBN approvals, and publication file exchanges.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2.5 z-10">
          <Link
            href="/admin/books"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Book
          </Link>
          <Link
            href="/admin/authors"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <UserPlus className="w-4 h-4" /> Add Author
          </Link>
          <Link
            href="/admin/uploads"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <Upload className="w-4 h-4" /> Upload File
          </Link>
        </div>
      </div>

      {/* Top 6 Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Books */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-blue-600 mb-3">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/80">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-400">BOOKS</span>
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{loading ? '...' : stats.totalBooks}</h3>
          <p className="text-xs text-slate-500 mt-1">Total Manuscripts</p>
        </div>

        {/* Total Authors */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-indigo-600 mb-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/80">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-400">AUTHORS</span>
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{loading ? '...' : stats.totalAuthors}</h3>
          <p className="text-xs text-slate-500 mt-1">Registered Authors</p>
        </div>

        {/* Pending Reviews */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-amber-600 mb-3">
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/80">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-400">PENDING</span>
          </div>
          <h3 className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">{loading ? '...' : stats.pendingReviews}</h3>
          <p className="text-xs text-slate-500 mt-1">Files Awaiting Review</p>
        </div>

        {/* Approved Files */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-emerald-600 mb-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/80">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-400">APPROVED</span>
          </div>
          <h3 className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{loading ? '...' : stats.approvedFiles}</h3>
          <p className="text-xs text-slate-500 mt-1">Approved Documents</p>
        </div>

        {/* Changes Requested */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-rose-600 mb-3">
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/80">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-400">REVISIONS</span>
          </div>
          <h3 className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">{loading ? '...' : stats.changesRequested}</h3>
          <p className="text-xs text-slate-500 mt-1">Changes Requested</p>
        </div>

        {/* Storage Used */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-600 mb-3">
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800">
              <HardDrive className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-400">STORAGE</span>
          </div>
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{loading ? '...' : `${stats.storageUsedMb} MB`}</h3>
          <p className="text-xs text-slate-500 mt-1">Supabase Vault</p>
        </div>
      </div>

      {/* Analytics Charts & Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Activity Weekly Trend Bar Chart */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">Weekly File Submissions</h3>
              <p className="text-xs text-slate-500">Manuscript & Artwork uploaded this week</p>
            </div>
            <span className="px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 text-xs font-semibold">
              Live Activity
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#fff' }}
                />
                <Bar dataKey="files" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Workflow Status Breakdown Donut Chart */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base mb-1">File Approval Breakdown</h3>
            <p className="text-xs text-slate-500 mb-4">Distribution by current file status</p>
            <div className="h-44 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="value">
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-700 dark:text-slate-300">{item.name}</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-slate-100">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Two Column Feeds: Recent Activity Audit & Latest Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Feed */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">Recent Audit Activity</h3>
            </div>
            <Link href="/admin/activity" className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1">
              View All <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3.5">
            {recentActivities.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No recent activity logged.</p>
            ) : (
              recentActivities.map((act) => (
                <div key={act.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 shrink-0 mt-0.5">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">{act.userName}</span>
                      <span className="text-slate-400">{new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-1">{act.details || act.action}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Notifications Feed */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">Latest Notifications</h3>
            </div>
            <Link href="/admin/notifications" className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1">
              View All <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3.5">
            {recentNotifications.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No unread notifications.</p>
            ) : (
              recentNotifications.map((notif) => (
                <div key={notif.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 shrink-0 mt-0.5">
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">{notif.title}</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2">{notif.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
