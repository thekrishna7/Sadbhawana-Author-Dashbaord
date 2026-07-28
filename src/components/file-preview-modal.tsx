'use client';

import React from 'react';
import { X, Download, FileText, ExternalLink } from 'lucide-react';

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: {
    id: string;
    fileName: string;
    filePath: string;
    fileType: string;
    fileSize: number;
    description?: string | null;
    version: number;
  } | null;
}

export function FilePreviewModal({ isOpen, onClose, file }: FilePreviewModalProps) {
  if (!isOpen || !file) return null;

  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(file.fileName) || file.fileType === 'COVER_DESIGN';
  const isPdf = /\.pdf$/i.test(file.fileName) || file.fileType === 'INTERIOR_PDF' || file.fileType === 'ISBN_PAGE';

  const downloadUrl = `/api/files/download/${file.id}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm md:text-base line-clamp-1">{file.fileName}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Type: <span className="font-medium text-slate-700 dark:text-slate-300">{file.fileType.replace('_', ' ')}</span> • Version {file.version} • {(file.fileSize / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={downloadUrl}
              download={file.fileName}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs md:text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" /> Download
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-auto p-6 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-950 min-h-[400px]">
          {isImage ? (
            <img
              src={file.filePath.startsWith('/uploads') ? 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800' : file.filePath}
              alt={file.fileName}
              className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-md border border-slate-200 dark:border-slate-800"
            />
          ) : isPdf ? (
            <iframe
              src={file.filePath.startsWith('/uploads') ? 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' : file.filePath}
              className="w-full h-[60vh] rounded-lg border border-slate-200 dark:border-slate-800"
              title={file.fileName}
            />
          ) : (
            <div className="text-center p-8 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 max-w-md shadow-sm">
              <FileText className="w-16 h-16 text-blue-500 mx-auto mb-4 opacity-80" />
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-lg mb-1">{file.fileName}</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Preview not directly embedded for <span className="font-mono text-xs font-semibold uppercase">{file.fileName.split('.').pop()}</span> format. Download file to view complete contents.
              </p>
              <a
                href={downloadUrl}
                download={file.fileName}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-colors shadow-md"
              >
                <Download className="w-4 h-4" /> Download File Now
              </a>
            </div>
          )}

          {file.description && (
            <div className="w-full mt-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Uploader Description: </span>
              <span className="text-slate-600 dark:text-slate-400">{file.description}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
