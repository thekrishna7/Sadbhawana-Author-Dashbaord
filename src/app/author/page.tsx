'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Upload,
  Bell,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  FileText,
  Eye,
  Download
} from 'lucide-react';
import { useToast } from '@/components/toast-context';

export default function AuthorHomePage() {
  const { showToast } = useToast();

  const [assignedBooks, setAssignedBooks] = useState<any[]>([]);
  const [recentFiles, setRecentFiles] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [meRes, bRes, fRes, nRes] = await Promise.all([
          fetch('/api/auth/me').then((r) => r.json()),
          fetch('/api/books').then((r) => r.json()),
          fetch('/api/files').then((r) => r.json()),
          fetch('/api/notifications').then((r) => r.json()),
        ]);

        setCurrentUser(meRes.user);
        setAssignedBooks(bRes.books || []);
        setRecentFiles(fRes.files || []);
        setNotifications((nRes.notifications || []).slice(0, 4));
      } catch {
        showToast('Error loading workspace data', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const pendingReviewFiles = recentFiles.filter((f) => f.status === 'SUBMITTED' || f.status === 'UNDER_REVIEW');

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
        <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold uppercase tracking-wider">
          Sadbhawana Author Workspace
        </span>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-2">
          Namaste, {currentUser?.fullName || 'Author'}!
        </h1>
        <p className="text-sm text-slate-300 mt-1 max-w-xl">
          Welcome to your publication portal. Access your assigned manuscripts, review cover designs, and exchange files with the editorial team.
        </p>

        <div className="flex flex-wrap gap-3 mt-6">
          <Link
            href="/author/books"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-md glow-primary"
          >
            <BookOpen className="w-4 h-4" /> View My Books ({assignedBooks.length})
          </Link>
          <Link
            href="/author/upload"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs border border-slate-700 transition-colors"
          >
            <Upload className="w-4 h-4" /> Submit Revised File
          </Link>
        </div>
      </div>

      {/* Actionable Alerts (Pending Files Needing Author Attention) */}
      {pendingReviewFiles.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/80 text-amber-600 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs md:text-sm">
                You have {pendingReviewFiles.length} file(s) awaiting your review & approval!
              </h4>
              <p className="text-xs text-amber-800 dark:text-amber-300">
                Inspect files received from the Sadbhawana admin team to approve or request revisions.
              </p>
            </div>
          </div>

          <Link
            href="/author/books"
            className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shrink-0 shadow-sm"
          >
            Review Now
          </Link>
        </div>
      )}

      {/* Assigned Books Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" /> My Assigned Books
          </h2>
          <Link href="/author/books" className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1">
            See All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-8 text-slate-400">Loading assigned books...</div>
        ) : assignedBooks.length === 0 ? (
          <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="font-bold text-slate-700 dark:text-slate-300">No books assigned yet</h4>
            <p className="text-xs text-slate-500 mt-1">Admin has not assigned any manuscript titles to your account yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assignedBooks.map((book) => (
              <div
                key={book.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start gap-4 mb-3">
                    <img
                      src={book.coverImageUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300'}
                      alt={book.name}
                      className="w-14 h-20 object-cover rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-bold uppercase">
                        {book.bookType}
                      </span>
                      <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm line-clamp-2 mt-1">{book.name}</h3>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">ISBN: {book.isbn || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">Status: <strong className="text-blue-600">{book.status.replace('_', ' ')}</strong></span>
                  <Link
                    href={`/author/books/${book.id}`}
                    className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-500"
                  >
                    Open Details <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Two Column Section: Recent Files & Latest Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Uploaded Files */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" /> Recent Document Exchanges
          </h3>

          <div className="space-y-3">
            {recentFiles.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No recent files.</p>
            ) : (
              recentFiles.slice(0, 4).map((file) => (
                <div key={file.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 truncate">{file.fileName}</h4>
                    <p className="text-[11px] text-slate-500 truncate">
                      {file.book?.name} • Version v{file.version}
                    </p>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                    file.status === 'APPROVED'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      : file.status === 'CHANGES_REQUESTED'
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                  }`}>
                    {file.status.replace('_', ' ')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Notifications */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-indigo-600" /> Latest Portal Notifications
          </h3>

          <div className="space-y-3">
            {notifications.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No notifications.</p>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">{n.title}</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{n.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
