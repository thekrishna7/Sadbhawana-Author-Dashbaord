'use client';

import React, { useEffect, useState } from 'react';
import {
  History,
  Search,
  Filter,
  Eye,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock,
  Layers,
  ArrowUpRight,
  Send,
  Inbox,
  Archive
} from 'lucide-react';
import { useToast } from '@/components/toast-context';
import { FilePreviewModal } from '@/components/file-preview-modal';
import { ChangeRequestModal } from '@/components/change-request-modal';
import { ApproveConfirmModal } from '@/components/approve-confirm-modal';

export default function AdminFileHistoryPage() {
  const { showToast } = useToast();

  const [files, setFiles] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'ALL' | 'RECEIVED' | 'SENT' | 'VERSIONS'>('ALL');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [bookFilter, setBookFilter] = useState('ALL');

  // Modals state
  const [selectedFileForPreview, setSelectedFileForPreview] = useState<any>(null);
  const [selectedFileForApprove, setSelectedFileForApprove] = useState<any>(null);
  const [selectedFileForChanges, setSelectedFileForChanges] = useState<any>(null);
  const [expandedVersionFileId, setExpandedVersionFileId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [fRes, bRes]: [any, any] = await Promise.all([
        fetch('/api/files').then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
        fetch('/api/books').then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
      ]);
      setFiles(fRes?.files || []);
      setBooks(bRes?.books || []);
    } catch {
      showToast('Failed to load file history', 'error');
    } finally {
      setLoading(false);
    }
  }

  const handleApproveFile = async () => {
    if (!selectedFileForApprove) return;
    try {
      const res = await fetch(`/api/files/${selectedFileForApprove.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' }),
      });
      if (res.ok) {
        showToast('File marked as APPROVED', 'success');
        loadData();
      } else {
        showToast('Failed to approve file', 'error');
      }
    } catch {
      showToast('Server error', 'error');
    }
  };

  const handleRequestChanges = async (details: string) => {
    if (!selectedFileForChanges) return;
    try {
      const res = await fetch(`/api/files/${selectedFileForChanges.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CHANGES_REQUESTED', changeDetails: details }),
      });
      if (res.ok) {
        showToast('Revision request submitted', 'info');
        loadData();
      } else {
        showToast('Failed to submit revision request', 'error');
      }
    } catch {
      showToast('Server error', 'error');
    }
  };

  // Filtered files according to tab & search criteria
  const filteredFiles = files.filter((file) => {
    const matchesSearch =
      file.fileName.toLowerCase().includes(search.toLowerCase()) ||
      (file.book?.name && file.book.name.toLowerCase().includes(search.toLowerCase())) ||
      (file.uploader?.fullName && file.uploader.fullName.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || file.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || file.fileType === typeFilter;
    const matchesBook = bookFilter === 'ALL' || file.bookId === bookFilter;

    let matchesTab = true;
    if (activeTab === 'RECEIVED') {
      matchesTab = file.uploader?.role === 'AUTHOR';
    } else if (activeTab === 'SENT') {
      matchesTab = file.uploader?.role === 'ADMIN';
    } else if (activeTab === 'VERSIONS') {
      matchesTab = (file.versions && file.versions.length > 0) || file.version > 1;
    }

    return matchesSearch && matchesStatus && matchesType && matchesBook && matchesTab;
  });

  const receivedCount = files.filter((f) => f.uploader?.role === 'AUTHOR').length;
  const sentCount = files.filter((f) => f.uploader?.role === 'ADMIN').length;
  const versionedCount = files.filter((f) => (f.versions && f.versions.length > 0) || f.version > 1).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
          <History className="w-7 h-7 text-blue-600" /> Complete File Exchange History
        </h1>
        <p className="text-sm text-slate-500">Comprehensive archive of all received files, sent files, revision logs, and version iterations (v1, v2, v3...).</p>
      </div>

      {/* Tabs Row */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all ${
            activeTab === 'ALL'
              ? 'bg-blue-600 text-white shadow-md glow-primary'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900'
          }`}
        >
          <History className="w-4 h-4" /> All Files ({files.length})
        </button>

        <button
          onClick={() => setActiveTab('RECEIVED')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all ${
            activeTab === 'RECEIVED'
              ? 'bg-blue-600 text-white shadow-md glow-primary'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900'
          }`}
        >
          <Inbox className="w-4 h-4 text-emerald-500" /> Received Files ({receivedCount})
        </button>

        <button
          onClick={() => setActiveTab('SENT')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all ${
            activeTab === 'SENT'
              ? 'bg-blue-600 text-white shadow-md glow-primary'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900'
          }`}
        >
          <Send className="w-4 h-4 text-indigo-500" /> Sent Files ({sentCount})
        </button>

        <button
          onClick={() => setActiveTab('VERSIONS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all ${
            activeTab === 'VERSIONS'
              ? 'bg-blue-600 text-white shadow-md glow-primary'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4 text-amber-500" /> Version History ({versionedCount})
        </button>
      </div>

      {/* Filter & Search Controls */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-3 items-center justify-between shadow-sm">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by file, book, or uploader..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
          <select
            value={bookFilter}
            onChange={(e) => setBookFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold max-w-[160px] truncate"
          >
            <option value="ALL">All Books</option>
            {books.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
          >
            <option value="ALL">All Types</option>
            <option value="MAIN_MANUSCRIPT">Main Manuscript</option>
            <option value="COVER_DESIGN">Cover Design</option>
            <option value="ISBN_PAGE">ISBN Page</option>
            <option value="INTERIOR_PDF">Interior PDF</option>
            <option value="ILLUSTRATION">Illustration</option>
            <option value="MARKETING_BANNER">Marketing Banner</option>
            <option value="OTHER">Other</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
          >
            <option value="ALL">All Statuses</option>
            <option value="APPROVED">Approved</option>
            <option value="CHANGES_REQUESTED">Changes Requested</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="RESUBMITTED">Resubmitted</option>
          </select>
        </div>
      </div>

      {/* Files History Table / Card List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading history records...</div>
      ) : filteredFiles.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No file history matches criteria</h3>
          <p className="text-xs text-slate-500 mt-1">Adjust filters or tabs to view file records.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredFiles.map((file) => {
            const isExpanded = expandedVersionFileId === file.id;
            const isReceived = file.uploader?.role === 'AUTHOR';

            return (
              <div
                key={file.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className={`p-3 rounded-2xl shrink-0 ${
                      isReceived ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600' : 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600'
                    }`}>
                      {isReceived ? <Inbox className="w-6 h-6" /> : <Send className="w-6 h-6" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                          isReceived ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
                        }`}>
                          {isReceived ? 'RECEIVED FROM AUTHOR' : 'SENT TO AUTHOR'}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold uppercase">
                          {file.fileType.replace('_', ' ')}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          file.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : file.status === 'CHANGES_REQUESTED'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {file.status.replace('_', ' ')}
                        </span>
                      </div>

                      <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base truncate">{file.fileName}</h3>
                      <p className="text-xs text-blue-600 font-semibold mt-0.5">{file.book?.name}</p>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
                        <span>Uploader: <strong>{file.uploader?.fullName}</strong></span>
                        <span>Current Version: <strong className="text-blue-600">v{file.version}</strong></span>
                        <span>Size: <strong>{(file.fileSize / (1024 * 1024)).toFixed(2)} MB</strong></span>
                        <span>Downloads: <strong>{file.downloadCount}</strong></span>
                        <span>Date: <strong>{new Date(file.createdAt).toLocaleString()}</strong></span>
                      </div>

                      {file.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl mt-3 border border-slate-100 dark:border-slate-800">
                          "{file.description}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions Header */}
                  <div className="flex flex-wrap items-center gap-2 self-start md:self-center shrink-0">
                    <button
                      onClick={() => setSelectedFileForPreview(file)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-blue-600 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Eye className="w-4 h-4" /> Preview
                    </button>
                    <a
                      href={`/api/files/download/${file.id}`}
                      download={file.fileName}
                      className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Download className="w-4 h-4" /> Download
                    </a>

                    {file.versions && file.versions.length > 0 && (
                      <button
                        onClick={() => setExpandedVersionFileId(isExpanded ? null : file.id)}
                        className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-1.5"
                      >
                        <Layers className="w-4 h-4" /> {isExpanded ? 'Hide Iterations' : `Version History (${file.versions.length})`}
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Version History List */}
                {isExpanded && file.versions && file.versions.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2 bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-2xl">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-amber-500" /> Historical Version Iterations for "{file.fileName}"
                    </h4>

                    <div className="space-y-2">
                      {file.versions.map((ver: any) => (
                        <div key={ver.id} className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                          <div>
                            <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 font-bold mr-2">
                              v{ver.version}
                            </span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{ver.fileName}</span>
                            <span className="text-slate-400 ml-2">({(ver.fileSize / (1024 * 1024)).toFixed(2)} MB)</span>
                            {ver.notes && <p className="text-[11px] text-slate-500 mt-1 italic">Notes: "{ver.notes}"</p>}
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {new Date(ver.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <FilePreviewModal
        isOpen={!!selectedFileForPreview}
        onClose={() => setSelectedFileForPreview(null)}
        file={selectedFileForPreview}
      />

      <ApproveConfirmModal
        isOpen={!!selectedFileForApprove}
        onClose={() => setSelectedFileForApprove(null)}
        onConfirm={handleApproveFile}
        fileName={selectedFileForApprove?.fileName || ''}
      />

      <ChangeRequestModal
        isOpen={!!selectedFileForChanges}
        onClose={() => setSelectedFileForChanges(null)}
        onSubmit={handleRequestChanges}
        fileName={selectedFileForChanges?.fileName || ''}
      />
    </div>
  );
}
