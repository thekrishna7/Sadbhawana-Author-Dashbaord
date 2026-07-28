'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Upload,
  BookOpen,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Download,
  Eye,
  Inbox,
  Send,
  Plus,
  Clock,
  Layers
} from 'lucide-react';
import { useToast } from '@/components/toast-context';
import { FilePreviewModal } from '@/components/file-preview-modal';
import { ChangeRequestModal } from '@/components/change-request-modal';
import { ApproveConfirmModal } from '@/components/approve-confirm-modal';

function UploadFormContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();

  const initialBookId = searchParams.get('bookId') || '';

  const [books, setBooks] = useState<any[]>([]);
  const [selectedBook, setSelectedBook] = useState<any | null>(null);
  const [bookFiles, setBookFiles] = useState<any[]>([]);
  const [fetchingBooks, setFetchingBooks] = useState(true);
  const [fetchingFiles, setFetchingFiles] = useState(false);

  // File Upload Form State
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState('MAIN_MANUSCRIPT');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);

  // Tabs for Selected Book Files
  const [fileTab, setFileTab] = useState<'RECEIVED' | 'SENT'>('RECEIVED');

  // Modals State
  const [selectedFileForPreview, setSelectedFileForPreview] = useState<any>(null);
  const [selectedFileForApprove, setSelectedFileForApprove] = useState<any>(null);
  const [selectedFileForChanges, setSelectedFileForChanges] = useState<any>(null);

  useEffect(() => {
    loadBooks();
  }, []);

  async function loadBooks() {
    try {
      const res = await fetch('/api/books');
      if (!res.ok) return;
      const data = await res.json();
      const bList = data?.books || [];
      setBooks(bList);

      if (initialBookId) {
        const found = bList.find((b: any) => b.id === initialBookId);
        if (found) {
          selectBook(found);
        }
      }
    } catch {
      showToast('Failed to load assigned books', 'error');
    } finally {
      setFetchingBooks(false);
    }
  }

  const selectBook = async (book: any) => {
    setSelectedBook(book);
    setFetchingFiles(true);
    try {
      const res = await fetch(`/api/files?bookId=${book.id}`);
      if (!res.ok) return;
      const data = await res.json();
      setBookFiles(data?.files || []);
    } catch {
      showToast('Failed to load files for selected book', 'error');
    } finally {
      setFetchingFiles(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !selectedBook) {
      showToast('Please select a file and a target book', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast('File size exceeds maximum allowed limit of 10MB', 'error');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bookId', selectedBook.id);
      formData.append('fileType', fileType);
      formData.append('description', description);

      const res = await fetch('/api/files', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'Upload failed', 'error');
        return;
      }

      showToast('File uploaded successfully! Admin notified.', 'success');
      setFile(null);
      setDescription('');
      selectBook(selectedBook);
    } catch {
      showToast('Server error during file upload', 'error');
    } finally {
      setUploading(false);
    }
  };

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
        if (selectedBook) selectBook(selectedBook);
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
        if (selectedBook) selectBook(selectedBook);
      } else {
        showToast('Failed to submit change request', 'error');
      }
    } catch {
      showToast('Server error', 'error');
    }
  };

  const receivedFiles = bookFiles.filter((f) => f.uploader?.role === 'ADMIN');
  const sentFiles = bookFiles.filter((f) => f.uploader?.role === 'AUTHOR');
  const currentFilesList = fileTab === 'RECEIVED' ? receivedFiles : sentFiles;

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      {/* STEP 1: Select Book View */}
      {!selectedBook ? (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
              <Upload className="w-7 h-7 text-blue-600" /> Upload Files & Document Workspace
            </h1>
            <p className="text-sm text-slate-500">
              Select one of your assigned books below to upload manuscript revisions, review received files from Admin, or check version history.
            </p>
          </div>

          {fetchingBooks ? (
            <div className="text-center py-16 text-slate-400">Loading assigned books...</div>
          ) : books.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
              <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No Assigned Books Available</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                You do not have any assigned books yet. Please contact Sadbhawana Publication Admin to assign catalog titles.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {books.map((book) => (
                <div
                  key={book.id}
                  onClick={() => selectBook(book)}
                  className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start gap-4 mb-4">
                      <img
                        src={book.coverImageUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300'}
                        alt={book.name}
                        className="w-16 h-22 object-cover rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md shrink-0 group-hover:scale-105 transition-transform"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-bold uppercase">
                          {book.bookType} • {book.edition}
                        </span>
                        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base line-clamp-2 mt-1 group-hover:text-blue-600 transition-colors">
                          {book.name}
                        </h3>
                        <p className="text-xs text-slate-400 font-mono mt-1">ISBN: {book.isbn || 'TBD'}</p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-4">
                      {book.description || 'Click to select this title for uploading files or reviewing received documents.'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">Status: <strong className="text-blue-600">{book.status.replace('_', ' ')}</strong></span>
                    <button
                      onClick={() => selectBook(book)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md glow-primary group-hover:translate-x-0.5 transition-all"
                    >
                      Select Book & Manage Files <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* STEP 2: Selected Book Upload & Received/Sent Files View */
        <div className="space-y-8">
          {/* Back Button & Selected Book Banner */}
          <div className="space-y-4">
            <button
              onClick={() => setSelectedBook(null)}
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to All Assigned Books
            </button>

            <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <img
                  src={selectedBook.coverImageUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300'}
                  alt={selectedBook.name}
                  className="w-16 h-22 object-cover rounded-2xl border border-white/20 shadow-md shrink-0"
                />
                <div>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold uppercase tracking-wider">
                    {selectedBook.bookType} • {selectedBook.edition}
                  </span>
                  <h2 className="text-2xl font-extrabold tracking-tight mt-1">{selectedBook.name}</h2>
                  <p className="text-xs text-slate-300 font-mono mt-0.5">ISBN: {selectedBook.isbn || 'Unassigned'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="px-3.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                  Total Files: {bookFiles.length}
                </span>
              </div>
            </div>
          </div>

          {/* Upload Form Box */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" /> Upload File for "{selectedBook.name}"
              </h3>
              <span className="text-xs font-medium text-slate-400">Max File Size: 10MB</span>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    File Type Category *
                  </label>
                  <select
                    required
                    value={fileType}
                    onChange={(e) => setFileType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-blue-500 font-semibold"
                  >
                    <option value="MAIN_MANUSCRIPT">Main Manuscript</option>
                    <option value="COVER_DESIGN">Cover Design</option>
                    <option value="ISBN_PAGE">ISBN Page</option>
                    <option value="INDEX">Index</option>
                    <option value="CERTIFICATE">Certificate</option>
                    <option value="ILLUSTRATION">Illustration</option>
                    <option value="INTERIOR_PDF">Interior PDF</option>
                    <option value="MARKETING_BANNER">Marketing Banner</option>
                    <option value="BACK_COVER">Back Cover</option>
                    <option value="SPINE">Spine</option>
                    <option value="SOURCE_FILE">Source File</option>
                    <option value="OTHER">Other Document</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Select File (Max 10MB) *
                  </label>
                  <input
                    type="file"
                    required
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Revision Notes / Instructions for Admin
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Attached Chapter 4 revision with updated figures..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={uploading || !file}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all shadow-md glow-primary flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" /> {uploading ? 'Uploading...' : 'Submit File to Admin'}
                </button>
              </div>
            </form>
          </div>

          {/* Received Files & Sent Files Tabs for this Book */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <button
                onClick={() => setFileTab('RECEIVED')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all ${
                  fileTab === 'RECEIVED'
                    ? 'bg-blue-600 text-white shadow-md glow-primary'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Inbox className="w-4 h-4 text-emerald-400" /> Received Files from Admin ({receivedFiles.length})
              </button>

              <button
                onClick={() => setFileTab('SENT')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all ${
                  fileTab === 'SENT'
                    ? 'bg-blue-600 text-white shadow-md glow-primary'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Send className="w-4 h-4 text-indigo-400" /> Sent Files by Me ({sentFiles.length})
              </button>
            </div>

            {fetchingFiles ? (
              <div className="text-center py-12 text-slate-400">Loading files...</div>
            ) : currentFilesList.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h4 className="font-bold text-slate-700 dark:text-slate-300">
                  No {fileTab === 'RECEIVED' ? 'Received' : 'Sent'} Files for this Book
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  {fileTab === 'RECEIVED'
                    ? 'Files uploaded by Admin for your review will appear here.'
                    : 'Use the form above to upload your first manuscript or cover file.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentFilesList.map((file) => (
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

                      {fileTab === 'RECEIVED' && file.status !== 'APPROVED' && (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            onClick={() => setSelectedFileForChanges(file)}
                            className="py-1.5 px-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                          >
                            <AlertCircle className="w-3.5 h-3.5" /> Request Changes
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

export default function AuthorUploadPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-slate-400">Loading workspace...</div>}>
      <UploadFormContent />
    </Suspense>
  );
}
