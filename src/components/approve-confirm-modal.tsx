'use client';

import React, { useState } from 'react';
import { X, CheckCircle2, Award } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ApproveConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  fileName: string;
}

export function ApproveConfirmModal({ isOpen, onClose, onConfirm, fileName }: ApproveConfirmModalProps) {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleApprove = async () => {
    setLoading(true);
    try {
      await onConfirm();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xl mb-1">Approve File Submission?</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 px-2">
          You are approving <span className="font-semibold text-slate-800 dark:text-slate-200">"{fileName}"</span>. Status will change to <span className="font-bold text-emerald-600 dark:text-emerald-400">APPROVED</span> and all parties will be notified.
        </p>

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleApprove}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium text-sm transition-all shadow-md glow-primary"
          >
            <Award className="w-4 h-4" /> {loading ? 'Approving...' : 'Confirm Approval'}
          </button>
        </div>
      </div>
    </div>
  );
}
