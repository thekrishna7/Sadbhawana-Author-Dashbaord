'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  ArrowLeft,
  Calendar,
  Layers,
  Globe,
  Upload,
  Download,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText
} from 'lucide-react';
import { useToast } from '@/components/toast-context';
import { FilePreviewModal } from '@/components/file-preview-modal';
import { ChangeRequestModal } from '@/components/change-request-modal';
import { ApproveConfirmModal } from '@/components/approve-confirm-modal';

export default function AuthorBookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams: any = React.use(params as any);
  const id = resolvedParams?.id || (params as any)?.id;
  const { showToast } = useToast();

  const [book, setBook] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'RECEIVED' | 'SENT'>('RECEIVED');
  const [selectedFileForPreview, setSelectedFileForPreview] = useState<any>(null);
  const [selectedFileForApprove, setSelectedFileForApprove] = useState<any>(null);
  const [selectedFileForChanges, setSelectedFileForChanges] = useState<any>(null);

  useEffect(() => {
    loadBookDetails();
  }, [id]);

  async function loadBookDetails() {
    try {
      const res = await fetch(`/api/books/${id}`);
      const data = await res.json();
      if (res.ok) {
        setBook(data.book);
      } else {
        showToast(data.error || 'Book not found', 'error');
      }
    } catch {
      showToast('Error loading book details', 'error');
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
        showToast('File approved! Admin notified.', 'success');
        loadBookDetails();
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
        showToast('Revision request sent to Admin', 'info');
        loadBookDetails();
      } else {
        showToast('Failed to submit change request', 'error');
      }
    } catch {
      showToast('Server error', 'error');
    }
  };

  if (loading) {
    return <div className="text-center py-16 text-slate-400">Loading publication details...</div>;
  }

  if (!book) {
    return (
      <div className="text-center py-16">
        <h3 className="text-xl font-bold">Book Not Found</h3>
        <Link href="/author/books" className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold">
          Return to My Books
        </Link>
      </div>
    );
  }

  const files = book.files || [];
  const receivedFiles = files.filter((f: any) => f.uploader?.role === 'ADMIN');
  const sentFiles = files.filter((f: any) => f.uploader?.role === 'AUTHOR');

  const pendingFilesCount = files.filter((f: any) => f.status === 'SUBMITTED' || f.status === 'UNDER_REVIEW').length;
  const approvedFilesCount = files.filter((f: any) => f.status === 'APPROVED').length;
  const rejectedFilesCount = files.filter((f: any) => f.status === 'CHANGES_REQUESTED').length;

  const currentFilesList = activeTab === 'RECEIVED' ? receivedFiles : sentFiles;

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <Link href="/author/books" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-blue-600 mb-3 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to My Books
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider">
              {book.bookType} • {book.edition}
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-2">{book.name}</h1>
            <p className="text-xs text-slate-500 font-mono mt-1">ISBN: {book.isbn || 'Unassigned'}</p>
          </div>

          <Link
            href={`/author/upload?bookId=${book.id}`}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all shadow-md glow-primary self-start md:self-auto"
          >
            <Upload className="w-4 h-4" /> Upload File to Admin
          </Link>
        </div>
      </div>

      {/* Book Metadata & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-6">
          <img
            src={book.coverImageUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400'}
            alt={book.name}
            className="w-32 h-44 object-cover rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md shrink-0 mx-auto md:mx-0"
          />
          <div className="flex-1 space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Publication Synopsis</h4>
              <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">{book.description || 'No synopsis provided.'}</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 font-medium block">Publication Date:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{book.publicationDate || 'TBD'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Language:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{book.language}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Status:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{book.status.replace('_', ' ')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Card */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base mb-4">Files Review Status</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/40">
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 block">TOTAL FILES</span>
              <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{files.length}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-900/40">
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 block">PENDING</span>
              <span className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">{pendingFilesCount}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900/40">
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block">APPROVED</span>
              <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{approvedFilesCount}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-100 dark:border-rose-900/40">
              <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 block">REVISIONS</span>
              <span className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">{rejectedFilesCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* File Tabs: Received vs Sent */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab('RECEIVED')}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all ${
              activeTab === 'RECEIVED'
                ? 'bg-blue-600 text-white shadow-md glow-primary'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Received Files from Admin ({receivedFiles.length})
          </button>
          <button
            onClick={() => setActiveTab('SENT')}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all ${
              activeTab === 'SENT'
                ? 'bg-blue-600 text-white shadow-md glow-primary'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Sent Files by Me ({sentFiles.length})
          </button>
        </div>

        {/* Files Grid */}
        {currentFilesList.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
              No {activeTab === 'RECEIVED' ? 'Received' : 'Sent'} Files
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              {activeTab === 'RECEIVED'
                ? 'Files uploaded by Admin for review will appear here.'
                : 'Click "Upload File to Admin" to send manuscript revisions.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentFilesList.map((file: any) => (
              <div
                key={file.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-bold uppercase tracking-wider">
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

                  <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm line-clamp-1 mb-1">{file.fileName}</h4>
                  <p className="text-xs text-slate-500 mb-3">
                    Version <span className="font-semibold text-blue-600">v{file.version}</span> • {(file.fileSize / (1024 * 1024)).toFixed(2)} MB
                  </p>

                  {file.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl mb-4 line-clamp-2 border border-slate-100 dark:border-slate-800">
                      "{file.description}"
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setSelectedFileForPreview(file)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5"
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
                  </div>

                  {/* Author Review Actions on Received Files */}
                  {activeTab === 'RECEIVED' && file.status !== 'APPROVED' && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => setSelectedFileForChanges(file)}
                        className="py-1.5 px-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" /> Request Changes
                      </button>
                      <button
                        onClick={() => setSelectedFileForApprove(file)}
                        className="py-1.5 px-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
