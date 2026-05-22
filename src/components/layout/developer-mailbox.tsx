"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, X, RefreshCw, Trash2, Eye, ShieldAlert, CheckCircle2 } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";

interface MockEmail {
  id: string;
  to: string;
  name: string;
  subject: string;
  body: string;
  html: string;
  sentAt: string;
  realSent: boolean;
  error?: string | null;
}

export function DeveloperMailbox({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [emails, setEmails] = useState<MockEmail[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<MockEmail | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/mock-emails.json?t=" + Date.now());
      if (res.ok) {
        const data = await res.json();
        setEmails(data);
        if (data.length > 0 && !selectedEmail) {
          setSelectedEmail(data[0]);
        }
      } else {
        setEmails([]);
      }
    } catch {
      setEmails([]);
    } finally {
      setLoading(false);
    }
  }

  async function clearEmails() {
    if (!confirm("Are you sure you want to clear the email simulator logs?")) return;
    try {
      await fetch("/api/notifications?clear=true", { method: "DELETE" });
      setEmails([]);
      setSelectedEmail(null);
    } catch (err) {
      console.error("Failed to clear emails:", err);
    }
  }

  useEffect(() => {
    if (isOpen) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
          {/* Backdrop Closer */}
          <div className="absolute inset-0" onClick={onClose} />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative flex h-full w-[800px] max-w-full flex-col border-l border-white/10 bg-zinc-950/95 shadow-2xl backdrop-blur-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/6 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Developer Mailbox</h3>
                  <p className="text-xs text-zinc-500">Local email template simulator & sandbox</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={load}
                  disabled={loading}
                  className="rounded-xl border border-white/10 bg-white/5 p-2 text-zinc-400 hover:text-white hover:bg-white/10 transition"
                  title="Refresh inbox"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </button>
                <button
                  onClick={clearEmails}
                  disabled={emails.length === 0}
                  className="rounded-xl border border-red-500/20 bg-red-500/10 p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 transition disabled:opacity-40"
                  title="Clear all logs"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  onClick={onClose}
                  className="rounded-full p-2 text-zinc-500 hover:text-white hover:bg-white/5 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Split Content */}
            <div className="flex flex-1 overflow-hidden">
              {/* Sidebar List */}
              <div className="w-[300px] shrink-0 border-r border-white/6 overflow-y-auto p-4 space-y-2">
                {emails.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Mail className="h-8 w-8 text-zinc-700 mb-2" />
                    <p className="text-sm font-medium text-zinc-500">Inbox is empty</p>
                    <p className="text-[11px] text-zinc-600 mt-1">Trigger notification events to view simulated HTML emails here.</p>
                  </div>
                ) : (
                  emails.map((email) => {
                    const active = selectedEmail?.id === email.id;
                    return (
                      <button
                        key={email.id}
                        onClick={() => setSelectedEmail(email)}
                        className={`w-full text-left rounded-xl p-3.5 border transition ${
                          active
                            ? "bg-violet-600/10 border-violet-500/30 text-white"
                            : "bg-white/2 border-white/5 text-zinc-400 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-1">
                          <p className="truncate text-xs font-semibold text-zinc-300">{email.to}</p>
                          <span className="text-[9px] text-zinc-600 shrink-0">
                            {new Date(email.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="font-bold text-xs truncate mt-1 text-white">{email.subject}</p>
                        <p className="text-[11px] line-clamp-2 mt-1.5 text-zinc-500 leading-relaxed">{email.body}</p>
                        <div className="flex gap-1.5 items-center mt-2.5">
                          {email.realSent ? (
                            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-500/10">
                              <CheckCircle2 className="h-2.5 w-2.5" /> Sent via Resend
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-500/10">
                              <Eye className="h-2.5 w-2.5" /> Simulated
                            </span>
                          )}
                          {email.error && (
                            <span className="text-[9px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full flex items-center gap-1 border border-red-500/10" title={email.error}>
                              <ShieldAlert className="h-2.5 w-2.5" /> API Error
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Main Preview Sandbox */}
              <div className="flex-1 flex flex-col bg-zinc-900/20 overflow-hidden">
                {selectedEmail ? (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Email Headers */}
                    <div className="p-6 border-b border-white/6 space-y-3 bg-zinc-950/40">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h4 className="text-sm font-bold text-white">{selectedEmail.subject}</h4>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 text-xs">
                            <span className="text-zinc-500">To:</span>
                            <span className="text-violet-300 font-medium">{selectedEmail.name} &lt;{selectedEmail.to}&gt;</span>
                          </div>
                        </div>
                        <span className="text-xs text-zinc-500 font-mono">
                          {new Date(selectedEmail.sentAt).toLocaleString()}
                        </span>
                      </div>
                      {selectedEmail.error && (
                        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400 flex items-start gap-2">
                          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold">Resend API Dispatch Failed:</span>
                            <p className="mt-0.5 text-zinc-500 font-mono text-[10px] break-all">{selectedEmail.error}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Interactive Frame Box */}
                    <div className="flex-1 p-6 overflow-hidden flex flex-col">
                      <div className="flex-1 rounded-2xl border border-white/10 overflow-hidden bg-black shadow-inner flex flex-col">
                        <div className="bg-zinc-900 px-4 py-2 border-b border-white/6 flex items-center gap-1.5 shrink-0">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                          <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                          <span className="text-[10px] text-zinc-500 font-mono ml-2">Sandboxed Preview (HTML)</span>
                        </div>
                        <iframe
                          srcDoc={selectedEmail.html}
                          title="HTML Email Sandbox"
                          sandbox="allow-popups allow-popups-to-escape-sandbox"
                          className="flex-1 w-full border-0 bg-[#030303]"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                    <Mail className="h-12 w-12 text-zinc-800 mb-3" />
                    <h4 className="text-sm font-semibold text-zinc-500">No email selected</h4>
                    <p className="text-xs text-zinc-600 mt-1 max-w-[240px]">Select a simulated email in the sidebar to review the templates.</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
