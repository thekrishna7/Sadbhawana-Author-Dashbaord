'use client';

import React, { useState } from 'react';
import { X, AlertTriangle, Send } from 'lucide-react';

interface ChangeRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (details: string) => Promise<void>;
  fileName: string;
}

export function ChangeRequestModal({ isOpen, onClose, onSubmit, fileName }: ChangeRequestModalProps) {
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!details.trim()) return;
    setLoading(true);
    try {
      await onSubmit(details);
      setDetails('');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-lg">Request File Changes</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{fileName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Detailed Revision Instructions *
            </label>
            <textarea
              rows={4}
              required
              placeholder="e.g. Please increase title font size on page 1, fix spine thickness for 250 pages, or replace cover artwork resolution..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300">
            Submission will update file status to <strong>Changes Requested</strong> and immediately notify the uploader via email & in-app message.
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !details.trim()}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-medium text-sm transition-colors shadow-md"
            >
              <Send className="w-4 h-4" /> {loading ? 'Submitting...' : 'Submit Revision Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
