'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  ArrowLeft,
  Calendar,
  Layers,
  Globe,
  User,
  Upload,
  Download,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  FileCheck,
  History,
  Send,
  Plus
} from 'lucide-react';
import { useToast } from '@/components/toast-context';
import { FilePreviewModal } from '@/components/file-preview-modal';

export default function AdminBookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams: any = React.use(params as any);
  const id = resolvedParams?.id || (params as any)?.id;
  const { showToast } = useToast();

  const [book, setBook] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'RECEIVED' | 'SENT'>('RECEIVED');
  const [selectedFileForPreview, setSelectedFileForPreview] = useState<any>(null);

  // Upload modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [fileType, setFileType] = useState('MAIN_MANUSCRIPT');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);

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

  const handleUploadFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileToUpload) return;

    if (fileToUpload.size > 10 * 1024 * 1024) {
      showToast('File size exceeds maximum 10MB limit', 'error');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', fileToUpload);
      formData.append('bookId', id);
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

      showToast('File uploaded successfully & synced with author', 'success');
      setUploadModalOpen(false);
      setFileToUpload(null);
      setDescription('');
      loadBookDetails();
    } catch {
      showToast('Server error during upload', 'error');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-16 text-slate-400">Loading publication details...</div>;
  }

  if (!book) {
    return (
      <div className="text-center py-16">
        <h3 className="text-xl font-bold">Book Not Found</h3>
        <Link href="/admin/books" className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold">
          Return to Books List
        </Link>
      </div>
    );
  }

  const files = book.files || [];
  const receivedFiles = files.filter((f: any) => f.uploader?.role === 'AUTHOR');
  const sentFiles = files.filter((f: any) => f.uploader?.role === 'ADMIN');

  const pendingFilesCount = files.filter((f: any) => f.status === 'SUBMITTED' || f.status === 'UNDER_REVIEW').length;
  const approvedFilesCount = files.filter((f: any) => f.status === 'APPROVED').length;
  const rejectedFilesCount = files.filter((f: any) => f.status === 'CHANGES_REQUESTED').length;

  const currentFilesList = activeTab === 'RECEIVED' ? receivedFiles : sentFiles;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Back button & Title */}
      <div>
        <Link href="/admin/books" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-blue-600 mb-3 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Books Catalog
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider">
              {book.bookType} • {book.edition}
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-2">{book.name}</h1>
            <p className="text-xs text-slate-500 font-mono mt-1">ISBN: {book.isbn || 'Unassigned'}</p>
          </div>

          <button
            onClick={() => setUploadModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all shadow-md glow-primary self-start md:self-auto"
          >
            <Upload className="w-4 h-4" /> Upload File for Book
          </button>
        </div>
      </div>

      {/* Book Metadata & Stats Summary Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details Card */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-6">
          <img
            src={book.coverImageUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400'}
            alt={book.name}
            className="w-32 h-44 object-cover rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md shrink-0 mx-auto md:mx-0"
          />
          <div className="flex-1 space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Publication Description</h4>
              <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">{book.description || 'No description provided.'}</p>
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

            {/* Assigned Authors list */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-400 block mb-2">Assigned Authors:</span>
              <div className="flex flex-wrap gap-2">
                {book.assignments?.map((a: any) => (
                  <div key={a.author.id} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200">
                    <img src={a.author.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60'} className="w-5 h-5 rounded-full object-cover" />
                    <span>{a.author.fullName}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* File Stats Card */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base mb-4">File Statistics Summary</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/40">
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 block">TOTAL FILES</span>
              <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{files.length}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-900/40">
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 block">PENDING REVIEW</span>
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

      {/* File Management Tabs: Received Files vs Sent Files */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('RECEIVED')}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all ${
                activeTab === 'RECEIVED'
                  ? 'bg-blue-600 text-white shadow-md glow-primary'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Received Files ({receivedFiles.length})
            </button>
            <button
              onClick={() => setActiveTab('SENT')}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all ${
                activeTab === 'SENT'
                  ? 'bg-blue-600 text-white shadow-md glow-primary'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Sent Files ({sentFiles.length})
            </button>
          </div>
        </div>

        {/* Files Grid */}
        {currentFilesList.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
              No {activeTab === 'RECEIVED' ? 'Received' : 'Sent'} Files Yet
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              {activeTab === 'RECEIVED'
                ? 'Uploaded files from the Author will appear here in real-time.'
                : 'Click "Upload File for Book" above to send files to the author.'}
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
                    Version <span className="font-semibold text-blue-600">v{file.version}</span> • {(file.fileSize / (1024 * 1024)).toFixed(2)} MB • {file.downloadCount} Downloads
                  </p>

                  {file.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl mb-4 line-clamp-2 border border-slate-100 dark:border-slate-800">
                      "{file.description}"
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedFileForPreview(file)}
                      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 hover:text-blue-600 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Eye className="w-4 h-4" /> Preview
                    </button>
                    <a
                      href={`/api/files/download/${file.id}`}
                      download={file.fileName}
                      className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 hover:bg-blue-100 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Download className="w-4 h-4" /> Download
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload File Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xl flex items-center gap-2">
                <Upload className="w-6 h-6 text-blue-600" /> Upload File for {book.name}
              </h3>
              <button onClick={() => setUploadModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadFile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  File Category Type *
                </label>
                <select
                  value={fileType}
                  onChange={(e) => setFileType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold"
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
                  onChange={(e) => setFileToUpload(e.target.files?.[0] || null)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">Supported: PDF, DOCX, DOC, PNG, JPG, PSD, AI, INDD, ZIP, RAR, TXT, XLSX, PPTX</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  File Description / Notes for Author
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Please review final spine thickness and font hierarchy."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !fileToUpload}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-md glow-primary"
                >
                  {uploading ? 'Uploading...' : 'Send File to Author'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      <FilePreviewModal
        isOpen={!!selectedFileForPreview}
        onClose={() => setSelectedFileForPreview(null)}
        file={selectedFileForPreview}
      />
    </div>
  );
}
