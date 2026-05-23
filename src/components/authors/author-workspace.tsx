"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { GlassCard } from "@/components/ui/glass-card";
import { MessagesPanel } from "@/components/messages/messages-panel";
import { ADMIN_NAV, AUTHOR_WORKSPACE_TABS } from "@/lib/constants";
import { formatCurrency, getInitials, cn } from "@/lib/utils";
import { useRealtimeTable } from "@/hooks/use-realtime";
import type { Profile, Book } from "@/lib/types/database";
import { PUBLISHING_STAGES } from "@/lib/constants";
import { ArrowLeft, Trash2, Loader2, X, Settings } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { ManageAccountModal } from "@/components/admin/manage-account-modal";

import { BookCover } from "@/components/books/book-cover";

const STATUS_COLORS: Record<string, string> = {
  active: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
  suspended: "text-red-400 bg-red-500/10 border-red-500/25",
  locked: "text-pink-400 bg-pink-500/10 border-pink-500/25",
  disabled: "text-zinc-400 bg-white/5 border-white/10",
  pending: "text-amber-400 bg-amber-500/10 border-amber-500/25",
};

export function AuthorWorkspace({
  authorId,
  adminProfile,
}: {
  authorId: string;
  adminProfile: Profile;
}) {
  const [tab, setTab] = useState("overview");
  const [author, setAuthor] = useState<Profile | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [royalties, setRoyalties] = useState<{
    available_balance: number;
    lifetime_earnings: number;
  } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const toast = useToast();

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: authorId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete author");

      toast.success(`Author "${author?.full_name}" deleted successfully.`);
      window.location.href = "/admin/authors";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete author.");
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  }

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: p }, { data: b }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", authorId).single(),
      supabase.from("books").select("*, sales(copies_sold, total_revenue)").eq("author_id", authorId),
      supabase.from("author_royalties").select("*").eq("author_id", authorId).single(),
    ]);
    setAuthor(p as Profile);
    setBooks((b as Book[]) ?? []);
    setRoyalties(r);
  }, [authorId]);

  useEffect(() => {
    load();
  }, [load]);
  useRealtimeTable("profiles", { column: "id", value: authorId }, load);

  if (!author) return null;

  const totalSales = books.reduce(
    (s, b) => s + Number((b as Book & { sales?: { copies_sold: number } }).sales?.copies_sold ?? 0),
    0
  );

  return (
    <DashboardShell
      nav={ADMIN_NAV}
      profile={adminProfile}
      brand="Author Dashboard"
      title={author.full_name}
      subtitle="Author workspace"
      actions={
        <button
          onClick={() => setManageModalOpen(true)}
          className="flex items-center gap-2 rounded-2xl border border-violet-500/30 bg-violet-500/10 px-5 py-2.5 text-sm font-semibold text-violet-300 hover:bg-violet-500/20 transition shadow-lg shadow-violet-950/20"
        >
          <Settings className="h-4 w-4" /> Manage Account
        </button>
      }
    >
      <Link href="/admin/authors" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> All authors
      </Link>

      <div className="relative h-48 rounded-3xl overflow-hidden">
        {author.banner_url ? (
          <Image src={author.banner_url} alt="" fill className="object-cover" />
        ) : (
          <div className="h-full bg-gradient-to-r from-violet-900/40 to-zinc-900" />
        )}
      </div>

      <div className="flex flex-wrap gap-2 -mt-20 relative z-10 px-4">
        {AUTHOR_WORKSPACE_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-2xl px-5 py-2.5 text-sm font-medium capitalize",
              tab === t ? "bg-violet-500/25 text-violet-200" : "text-zinc-500 hover:text-white"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {tab === "overview" && (
            <div className="grid gap-10 lg:grid-cols-[200px_1fr] mt-6">
              <div className="relative h-40 w-40 rounded-3xl overflow-hidden border-4 border-[#050508] -mt-16">
                {author.avatar_url ? (
                   <Image src={author.avatar_url} alt="" fill className="object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center bg-violet-500/20 text-3xl font-bold text-violet-300">
                    {getInitials(author.full_name)}
                  </div>
                )}
              </div>
              <div className="space-y-6 lg:col-span-1">
                <GlassCard className="p-10 space-y-4" hover={false}>
                  <p className="text-zinc-400">{author.bio || "No biography yet."}</p>
                  <div className="grid sm:grid-cols-2 gap-4 text-sm">
                    <Info label="Email" value={author.email} />
                    <Info label="Phone" value={author.phone ?? "â€”"} />
                    <Info label="Website" value={author.website ?? "â€”"} />
                    <Info label="Joined" value={new Date(author.created_at).toLocaleDateString()} />
                    <div className="sm:col-span-2">
                      <p className="text-zinc-600 mb-1.5">Account Status</p>
                      <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${
                        STATUS_COLORS[author.status] ?? "text-zinc-400 border-white/10"
                      }`}>
                        {author.status}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 pt-4">
                    <Stat label="Active books" value={String(books.length)} />
                    <Stat label="Total sales" value={String(totalSales)} />
                    <Stat label="Royalties" value={formatCurrency(royalties?.lifetime_earnings ?? 0)} />
                  </div>
                </GlassCard>
              </div>
            </div>
          )}
          {tab === "books" && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-6">
              {books.map((book) => (
                <Link key={book.id} href={`/admin/books/${book.id}`}>
                  <GlassCard className="overflow-hidden p-0!">
                    <div className="relative aspect-[3/4] bg-zinc-900 overflow-hidden">
                      <BookCover title={book.title} coverUrl={book.cover_url} />
                    </div>
                    <div className="p-6">
                      <p className="font-semibold text-white">{book.title}</p>
                      <p className="text-sm text-zinc-500 capitalize mt-1">
                        {PUBLISHING_STAGES.find((s) => s.key === book.current_stage)?.label}
                      </p>
                      <div className="mt-3 h-1.5 rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-violet-500"
                          style={{ width: `${book.progress_percent}%` }}
                        />
                      </div>
                    </div>
                  </GlassCard>
                </Link>
              ))}
              {books.length === 0 && (
                <p className="text-zinc-500 col-span-full">No books assigned.</p>
              )}
            </div>
          )}
          {tab === "royalties" && royalties && (
            <div className="grid gap-6 md:grid-cols-3 mt-6">
              <GlassCard glow>
                <p className="text-sm text-zinc-500">Available</p>
                <p className="text-4xl font-bold text-emerald-400 mt-2">
                  {formatCurrency(royalties.available_balance)}
                </p>
              </GlassCard>
              <GlassCard>
                <p className="text-sm text-zinc-500">Lifetime</p>
                <p className="text-4xl font-bold text-white mt-2">
                  {formatCurrency(royalties.lifetime_earnings)}
                </p>
              </GlassCard>
            </div>
          )}
          {tab === "messages" && (
            <div className="mt-6">
              <MessagesPanel
                authorId={author.id}
                currentUserId={adminProfile.id}
                title={`Chat with ${author.full_name}`}
              />
            </div>
          )}
          {tab === "documents" && (
            <p className="text-zinc-500 mt-6">Documents are managed per book in book workspace.</p>
          )}
          {tab === "activity" && (
            <AuthorActivity authorId={authorId} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* â”€â”€ Delete Author Confirmation Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 8 }}
              transition={{ type: "spring", damping: 22, stiffness: 300 }}
              className="w-full max-w-md overflow-hidden rounded-3xl border border-red-500/20 bg-zinc-950/95 shadow-2xl backdrop-blur-xl"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between border-b border-white/5 bg-zinc-950/95 backdrop-blur-xl px-6 py-4">
                <div className="flex items-center gap-2 text-red-400">
                  <Trash2 className="h-5 w-5" />
                  <h3 className="text-base font-bold">Delete Author Account</h3>
                </div>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="rounded-full bg-white/5 p-1.5 text-zinc-400 hover:text-white transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-sm text-zinc-300">
                  Are you sure you want to permanently delete the author account for{" "}
                  <span className="text-white font-semibold">"{author?.full_name}"</span>?
                </p>
                
                <div className="rounded-xl border border-red-500/20 bg-red-950/20 px-4 py-3">
                  <p className="text-xs text-red-300 leading-relaxed font-medium">
                    <strong>Warning:</strong> Deleting this author will permanently clean up their user account, profile, all associated books, manuscripts, royalty transactions, cover designs, and messages. This action is irreversible.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/5 bg-zinc-900/20">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDelete}
                  className="rounded-xl bg-red-600 px-5 py-2 text-xs font-bold text-white hover:bg-red-500 disabled:opacity-50 transition flex items-center gap-2 shadow-lg shadow-red-950/30"
                >
                  {deleting && <Loader2 className="h-3 w-3 animate-spin" />}
                  Delete Account
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ManageAccountModal
        open={manageModalOpen}
        onClose={() => setManageModalOpen(false)}
        profile={author}
        onUpdate={load}
      />
    </DashboardShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-zinc-600">{label}</p>
      <p className="text-white">{value}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

function AuthorActivity({ authorId }: { authorId: string }) {
  const [logs, setLogs] = useState<{ action: string; created_at: string }[]>([]);
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("activity_logs")
      .select("action, created_at")
      .eq("user_id", authorId)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setLogs(data ?? []));
  }, [authorId]);
  return (
    <ul className="space-y-3 mt-6">
      {logs.map((l, i) => (
        <li key={i} className="rounded-2xl border border-white/5 px-4 py-3 text-sm capitalize">
          {l.action.replace(/_/g, " ")} â€” {new Date(l.created_at).toLocaleString()}
        </li>
      ))}
    </ul>
  );
}

