'use client';

import React, { useEffect, useState } from 'react';
import { Settings, Mail, Server, Database, Save, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useToast } from '@/components/toast-context';

export default function AdminSettingsPage() {
  const { showToast } = useToast();

  const [smtpSender, setSmtpSender] = useState('admin.sadbhawanapublication@gmail.com');
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState('587');

  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        setEmailLogs(data.emailLogs || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'SMTP_CONFIG', value: JSON.stringify({ smtpSender, smtpHost, smtpPort }) }),
      });
      showToast('Settings saved successfully', 'success');
    } catch {
      showToast('Failed to save settings', 'error');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
          <Settings className="w-7 h-7 text-blue-600" /> System & Storage Settings
        </h1>
        <p className="text-sm text-slate-500">Configure SMTP credentials (`admin.sadbhawanapublication@gmail.com`), storage bucket limits, and review email logs.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SMTP Configuration Form */}
        <div className="lg:col-span-1 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Mail className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">Gmail SMTP Config</h3>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Sender Email Address
              </label>
              <input
                type="email"
                required
                value={smtpSender}
                onChange={(e) => setSmtpSender(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                SMTP Host
              </label>
              <input
                type="text"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                SMTP Port
              </label>
              <input
                type="text"
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-mono"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all shadow-md glow-primary flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" /> Save SMTP Config
            </button>
          </form>
        </div>

        {/* Email Logs Stream */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
              <Server className="w-5 h-5 text-indigo-600" /> Dispatched Email Log History
            </h3>
            <span className="text-xs font-semibold text-slate-400">Total: {emailLogs.length}</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 max-h-96 pr-2">
            {emailLogs.length === 0 ? (
              <p className="text-center py-8 text-xs text-slate-400">No emails dispatched yet.</p>
            ) : (
              emailLogs.map((log) => (
                <div key={log.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100">{log.recipientEmail}</span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-extrabold text-[10px]">
                        {log.status}
                      </span>
                    </div>
                    <p className="font-semibold text-blue-600 dark:text-blue-400 mt-0.5">{log.subject}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono shrink-0">
                    {new Date(log.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
