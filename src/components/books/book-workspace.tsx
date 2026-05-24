"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { GlassCard } from "@/components/ui/glass-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBanner } from "@/components/ui/error-banner";
import { PublishingJourney } from "./publishing-journey";
import { ManuscriptsPanel } from "./manuscripts-panel";
import { CoversPanel } from "./covers-panel";
import { SalesPanel } from "./sales-panel";
import { BookTimeline } from "./book-timeline";
import { MessagesPanel } from "@/components/messages/messages-panel";
import { useRealtimeTable } from "@/hooks/use-realtime";
import { PUBLISHING_STAGES } from "@/lib/constants";
import { formatCurrency, cn } from "@/lib/utils";
import type { Book, Profile, Sales } from "@/lib/types/database";
import { useToast } from "@/components/ui/toast";
import { sendNotification } from "@/lib/notifications";
import { uploadPrivate, resolveFileUrl, storageRef, parseStorageRef } from "@/lib/storage";
import {
  ArrowLeft,
  FileText,
  ImageIcon,
  BarChart3,
  Wallet,
  MessageSquare,
  Clock,
  Settings,
  BookOpen,
  GitBranch,
  Upload,
  Download,
  Eye,
  X,
  Loader2,
  Trash2,
} from "lucide-react";

const TAB_CONFIG = [
  { key: "overview", label: "Overview", icon: BookOpen },
  { key: "journey", label: "Publishing Journey", icon: GitBranch },
  { key: "manuscripts", label: "Manuscripts", icon: FileText },
  { key: "covers", label: "Cover Designs", icon: ImageIcon },
  { key: "sales", label: "Sales", icon: BarChart3 },
  { key: "royalties", label: "Royalties", icon: Wallet },
  { key: "messages", label: "Messages", icon: MessageSquare },
  { key: "documents", label: "Documents", icon: FileText },
  { key: "timeline", label: "Timeline", icon: Clock },
  { key: "settings", label: "Settings", icon: Settings },
] as const;

type TabKey = (typeof TAB_CONFIG)[number]["key"];

import { BookCover } from "./book-cover";

export function BookWorkspace({
  bookId,
  basePath,
  isAdmin,
  currentUserId,
}: {
  bookId: string;
  basePath: string;
  isAdmin: boolean;
  currentUserId: string;
}) {
  const [tab, setTab] = useState<TabKey>("overview");
  const [book, setBook] = useState<(Book & { author?: Profile }) | null>(null);
  const [sales, setSales] = useState<Sales | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const supabase = createClient();
  const toast = useToast();

  async function handleDelete() {
    if (!book) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/delete-book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete book");
      
      toast.success(`Book "${book.title}" deleted successfully.`);
      window.location.href = basePath;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete book.");
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  }

  const load = useCallback(async () => {
    setError(null);
    const [{ data: b, error: bErr }, { data: s, error: sErr }] =
      await Promise.all([
        supabase
          .from("books")
          .select("*, author:profiles(full_name, avatar_url, role)")
          .eq("id", bookId)
          .single(),
        supabase.from("sales").select("*").eq("book_id", bookId).maybeSingle(),
      ]);

    if (bErr) setError(bErr.message);
    else setBook(b as typeof book);

    if (sErr) setError(sErr.message);
    else setSales(s as Sales);

    setLoading(false);
  }, [bookId, supabase]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeTable("books", { column: "id", value: bookId }, load);
  useRealtimeTable("sales", { column: "book_id", value: bookId }, load);

  if (loading) {
    return (
      <div className="space-y-10">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-80 w-full rounded-3xl" />
      </div>
    );
  }

  if (error || !book) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Not Found"
        description={error || "Book workspace could not be loaded."}
        action={
          <Link href={basePath} className="text-violet-400">
            ← Go back
          </Link>
        }
      />
    );
  }

  const stageLabel =
    PUBLISHING_STAGES.find((s) => s.key === book.current_stage)?.label ??
    book.current_stage;

  return (
    <div className="space-y-10">
      <Link
        href={basePath}
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      {tab === "overview" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative overflow-hidden rounded-3xl glass-strong glow-violet"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 via-transparent to-amber-500/5" />
          <div className="relative grid gap-10 p-10 lg:grid-cols-[280px_1fr]">
            <div className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-zinc-900 shadow-2xl">
              <BookCover title={book.title} coverUrl={book.cover_url} />
            </div>
            <div className="space-y-6">
              <div>
                <p className="text-sm uppercase tracking-widest text-violet-400">
                  {stageLabel}
                </p>
                <h1 className="text-5xl font-bold text-white mt-2">{book.title}</h1>
                {book.subtitle && (
                  <p className="text-2xl text-zinc-400 mt-2">{book.subtitle}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-6 text-zinc-400">
                <span>Author: {book.author?.full_name}</span>
                {book.genre && <span>Genre: {book.genre}</span>}
                {book.isbn && <span>ISBN: {book.isbn}</span>}
                {book.launch_date && (
                  <span>Launch: {new Date(book.launch_date).toLocaleDateString()}</span>
                )}
              </div>
              <div className="h-3 rounded-full bg-white/10 overflow-hidden max-w-md">
                <motion.div
                  className="h-full bg-gradient-to-r from-violet-500 to-purple-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${book.progress_percent}%` }}
                />
              </div>
              <p className="text-sm text-zinc-500">{book.progress_percent}% complete</p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Stat label="Copies sold" value={String(sales?.copies_sold ?? 0)} />
                <Stat
                  label="Revenue"
                  value={formatCurrency(Number(sales?.total_revenue ?? 0))}
                />
                <Stat label="Royalty %" value={`${book.royalty_percent}%`} />
                <Stat label="Stage" value={stageLabel} />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="flex flex-wrap gap-2 border-b border-white/6 pb-4">
        {TAB_CONFIG.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition",
                tab === t.key
                  ? "bg-violet-500/20 text-violet-200"
                  : "text-zinc-500 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
        >
          {tab === "journey" && (
            <PublishingJourney
              bookId={bookId}
              currentStage={book.current_stage}
              isAdmin={isAdmin}
              currentUserId={currentUserId}
              onStageChange={load}
            />
          )}
          {tab === "manuscripts" && (
            <ManuscriptsPanel
              bookId={bookId}
              isAdmin={isAdmin}
              currentUserId={currentUserId}
            />
          )}
          {tab === "covers" && (
            <CoversPanel
              bookId={bookId}
              isAdmin={isAdmin}
              currentUserId={currentUserId}
            />
          )}
          {tab === "sales" && (
            <SalesPanel
              bookId={bookId}
              sales={sales ?? undefined}
              isAdmin={isAdmin}
              onUpdate={load}
            />
          )}
          {tab === "royalties" && (
            <RoyaltiesTab authorId={book.author_id} bookId={bookId} isAdmin={isAdmin} />
          )}
          {tab === "messages" && (
            <MessagesPanel
              bookId={bookId}
              currentUserId={currentUserId}
              title={`${book.title} — Team`}
            />
          )}
          {tab === "documents" && (
            <DocumentsTab bookId={bookId} authorId={book.author_id} isAdmin={isAdmin} currentUserId={currentUserId} />
          )}
          {tab === "timeline" && <BookTimeline bookId={bookId} />}
          {tab === "settings" && isAdmin && (
            <BookSettings book={book} onSave={load} onDeleteRequest={() => setShowDeleteModal(true)} />
          )}
          {tab === "settings" && !isAdmin && (
            <p className="text-zinc-500">Contact HQ to update book settings.</p>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ── Delete Confirmation Modal ────────────────────────────────────────── */}
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
              <div className="flex items-center justify-between border-b border-white/5 bg-zinc-950/95 backdrop-blur-xl px-6 py-4">
                <div className="flex items-center gap-2 text-red-400">
                  <Trash2 className="h-5 w-5" />
                  <h3 className="text-base font-bold">Delete Book Workspace</h3>
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
                  Are you sure you want to permanently delete the book{" "}
                  <span className="text-white font-semibold">"{book.title}"</span>?
                </p>
                
                <div className="rounded-xl border border-red-500/20 bg-red-950/20 px-4 py-3">
                  <p className="text-xs text-red-300 leading-relaxed">
                    <strong>Warning:</strong> This action is permanent and will delete the book's manuscript, cover design files, conversations, activity logs, and transaction records.
                  </p>
                </div>
              </div>

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
                  Delete Book
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <GlassCard className="p-4!" hover={false}>
      <p className="text-xs text-zinc-500 uppercase tracking-wide">{label}</p>
      <p className="text-xl font-semibold text-white mt-1">{value}</p>
    </GlassCard>
  );
}

function RoyaltiesTab({ authorId, bookId, isAdmin }: { authorId: string; bookId: string; isAdmin: boolean }) {
  const [royalties, setRoyalties] = useState<{
    available_balance: number;
    pending_balance: number;
    lifetime_earnings: number;
    total_withdrawn?: number;
    last_payout_at?: string | null;
  } | null>(null);
  const [transactions, setTransactions] = useState<{ id: string; amount: number; tx_type: string; description: string | null; created_at: string }[]>([]);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditDesc, setCreditDesc] = useState("");
  const [crediting, setCrediting] = useState(false);

  const loadRoyalties = useCallback(async () => {
    const supabase = createClient();
    const [rRes, tRes] = await Promise.all([
      supabase.from("author_royalties").select("*").eq("author_id", authorId).single(),
      supabase.from("royalty_transactions").select("*").eq("author_id", authorId).eq("book_id", bookId).order("created_at", { ascending: false }).limit(10),
    ]);
    setRoyalties(rRes.data);
    setTransactions(tRes.data ?? []);
  }, [authorId, bookId]);

  useEffect(() => { loadRoyalties(); }, [loadRoyalties]);

  async function creditRoyalty(e: React.FormEvent) {
    e.preventDefault();
    if (!creditAmount || !creditDesc) return;
    setCrediting(true);
    await fetch("/api/admin/royalties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ author_id: authorId, book_id: bookId, amount: Number(creditAmount), description: creditDesc, tx_type: "credit" }),
    });
    setCrediting(false);
    setCreditAmount("");
    setCreditDesc("");
    loadRoyalties();
  }

  if (!royalties) return <Skeleton className="h-48" />;

  return (
    <div className="space-y-8">
      {/* Wallet Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <GlassCard glow className="p-6!">
          <p className="text-xs text-zinc-500 uppercase tracking-widest">Available Balance</p>
          <p className="text-3xl font-bold text-emerald-400 mt-2">{formatCurrency(Number(royalties.available_balance))}</p>
        </GlassCard>
        <GlassCard className="p-6!">
          <p className="text-xs text-zinc-500 uppercase tracking-widest">Pending</p>
          <p className="text-3xl font-bold text-amber-400 mt-2">{formatCurrency(Number(royalties.pending_balance))}</p>
        </GlassCard>
        <GlassCard className="p-6!">
          <p className="text-xs text-zinc-500 uppercase tracking-widest">Lifetime Earnings</p>
          <p className="text-3xl font-bold text-white mt-2">{formatCurrency(Number(royalties.lifetime_earnings))}</p>
          {royalties.last_payout_at && (
            <p className="text-xs text-zinc-600 mt-2">Last payout: {new Date(royalties.last_payout_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
          )}
        </GlassCard>
      </div>

      {/* Admin Credit Form */}
      {isAdmin && (
        <GlassCard className="max-w-lg space-y-4 p-8" hover={false}>
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-violet-400" />
            <h3 className="text-base font-semibold text-white">Credit Royalty for this Book</h3>
          </div>
          <form onSubmit={creditRoyalty} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Amount (₹)</label>
              <input
                type="number"
                required
                min={1}
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                placeholder="e.g. 2500"
                className="mt-1.5 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white text-sm placeholder-zinc-600"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Description</label>
              <input
                type="text"
                required
                value={creditDesc}
                onChange={(e) => setCreditDesc(e.target.value)}
                placeholder="e.g. Q2 2025 sales royalty"
                className="mt-1.5 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white text-sm placeholder-zinc-600"
              />
            </div>
            <button
              type="submit"
              disabled={crediting}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-3 font-semibold text-white hover:opacity-90 disabled:opacity-50 transition text-sm"
            >
              {crediting ? <><Loader2 className="h-4 w-4 animate-spin" /> Crediting…</> : <><Wallet className="h-4 w-4" /> Credit Royalty</>}
            </button>
          </form>
        </GlassCard>
      )}

      {/* Book Royalty Ledger */}
      {transactions.length > 0 && (
        <GlassCard hover={false}>
          <div className="px-6 pt-6 pb-4 border-b border-white/6">
            <h3 className="text-base font-semibold text-white">Royalty Ledger — This Book</h3>
          </div>
          <ul className="divide-y divide-white/4">
            {transactions.map((t) => (
              <li key={t.id} className="flex items-center justify-between px-6 py-4 text-sm">
                <div>
                  <p className="text-zinc-300">{t.description ?? t.tx_type}</p>
                  <p className="text-xs text-zinc-600 mt-0.5">{new Date(t.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                </div>
                <span className={cn("font-bold font-mono", Number(t.amount) >= 0 ? "text-emerald-400" : "text-red-400")}>
                  {Number(t.amount) >= 0 ? "+" : ""}{formatCurrency(Math.abs(Number(t.amount)))}
                </span>
              </li>
            ))}
          </ul>
        </GlassCard>
      )}
    </div>
  );
}

interface DocumentType {
  id: string;
  book_id: string;
  author_id: string;
  title: string;
  file_url: string;
  file_name: string;
  file_size: number;
  category: string;
  uploaded_by: string;
  created_at: string;
  uploader?: {
    full_name: string;
  };
}

function DocumentsTab({
  bookId,
  authorId,
  isAdmin,
  currentUserId,
}: {
  bookId: string;
  authorId: string;
  isAdmin: boolean;
  currentUserId: string;
}) {
  const [docs, setDocs] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upload modal state
  const [showUpload, setShowUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docCategory, setDocCategory] = useState<string>("agreement");
  const [docTitle, setDocTitle] = useState("");
  const [uploading, setUploading] = useState(false);

  // Preview modal state
  const [previewDoc, setPreviewDoc] = useState<{ title: string; url: string; isImage: boolean; isPdf: boolean } | null>(null);
  const [resolvingPreview, setResolvingPreview] = useState<string | null>(null);

  const toast = useToast();

  const load = useCallback(async () => {
    setError(null);
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("documents")
      .select("*, uploader:profiles!uploaded_by(full_name)")
      .or(`book_id.eq.${bookId},author_id.eq.${authorId}`)
      .order("created_at", { ascending: false });

    if (err) {
      setError(err.message);
    } else {
      setDocs(data ?? []);
    }
    setLoading(false);
  }, [bookId, authorId]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeTable("documents", { column: "book_id", value: bookId }, load);

  const formatBytes = (bytes: number, decimals = 2) => {
    if (!bytes || isNaN(bytes)) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  const getCategoryDetails = (category: string) => {
    switch (category) {
      case "agreement":
        return { label: "Agreement", badge: "bg-blue-500/10 border-blue-500/20 text-blue-400" };
      case "isbn_certificate":
        return { label: "ISBN Certificate", badge: "bg-purple-500/10 border-purple-500/20 text-purple-400" };
      case "invoice":
        return { label: "Invoice", badge: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" };
      case "royalty_statement":
        return { label: "Royalty Statement", badge: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" };
      case "contract":
        return { label: "Contract", badge: "bg-amber-500/10 border-amber-500/20 text-amber-400" };
      default:
        return { label: "Other Document", badge: "bg-zinc-500/10 border-zinc-500/20 text-zinc-400" };
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!docTitle) {
        // Strip extension from title placeholder
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
        setDocTitle(nameWithoutExt);
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !isAdmin) return;
    setUploading(true);
    setError(null);

    try {
      const supabase = createClient();
      const path = `${bookId}/${Date.now()}-${selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { path: storedPath } = await uploadPrivate("documents", path, selectedFile);
      const fileRef = storageRef("documents", storedPath);

      const { error: insertErr } = await supabase.from("documents").insert({
        book_id: bookId,
        author_id: authorId,
        title: docTitle.trim() || selectedFile.name,
        file_url: fileRef,
        file_name: selectedFile.name,
        file_size: selectedFile.size,
        category: docCategory,
        uploaded_by: currentUserId,
      });

      if (insertErr) throw insertErr;

      // Log activity
      await supabase.from("activity_logs").insert({
        book_id: bookId,
        user_id: currentUserId,
        action: "document_uploaded",
        entity_type: "document",
        metadata: { title: docTitle.trim() || selectedFile.name, category: docCategory },
      });

      toast.success("Document uploaded successfully!");
      setShowUpload(false);
      setSelectedFile(null);
      setDocTitle("");
      setDocCategory("agreement");
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to upload document";
      setError(msg);
      toast.error("Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const checkPreviewable = (fileName: string) => {
    return /\.(pdf|png|jpe?g|webp|svg)$/i.test(fileName);
  };

  const handlePreview = async (doc: DocumentType) => {
    setResolvingPreview(doc.id);
    try {
      const ref = parseStorageRef(doc.file_url);
      const url = ref
        ? await resolveFileUrl(ref.path, ref.bucket)
        : await resolveFileUrl(doc.file_url, "documents");

      const isImage = /\.(png|jpe?g|webp|svg)$/i.test(doc.file_name);
      const isPdf = /\.pdf$/i.test(doc.file_name);

      setPreviewDoc({
        title: doc.title,
        url,
        isImage,
        isPdf,
      });
    } catch {
      toast.error("Failed to generate file preview url.");
    } finally {
      setResolvingPreview(null);
    }
  };

  const handleDownload = async (doc: DocumentType) => {
    try {
      const ref = parseStorageRef(doc.file_url);
      const url = ref
        ? await resolveFileUrl(ref.path, ref.bucket)
        : await resolveFileUrl(doc.file_url, "documents");
      window.open(url, "_blank");
    } catch {
      toast.error("Failed to download file.");
    }
  };

  return (
    <div className="space-y-6">
      <ErrorBanner message={error ?? ""} onDismiss={() => setError(null)} />

      <GlassCard className="flex flex-wrap items-center justify-between gap-4 p-6! border-zinc-800" hover={false}>
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-violet-400" />
            Document Vault
          </h3>
          <p className="text-xs text-zinc-500 mt-1">Access signed agreements, invoices, ISBN certificates, and contracts.</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-violet-600/20 hover:bg-violet-500 transition animate-fade-in"
          >
            <Upload className="h-3.5 w-3.5" /> Upload Document
          </button>
        )}
      </GlassCard>

      {loading ? (
        <div className="flex justify-center items-center py-12 text-zinc-500 gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-violet-400" /> Loading documents…
        </div>
      ) : docs.length === 0 ? (
        <EmptyState icon={FileText} title="No documents uploaded" description="Agreements and certificates will appear here once uploaded by headquarters." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {docs.map((d) => {
            const cat = getCategoryDetails(d.category);
            const previewable = checkPreviewable(d.file_name);
            return (
              <GlassCard key={d.id} className="p-6! border-white/5 flex flex-col justify-between h-full" hover>
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-white text-base leading-snug">{d.title}</p>
                      <p className="text-xs text-zinc-500 mt-1 truncate max-w-[240px] font-mono">{d.file_name}</p>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${cat.badge}`}>
                      {cat.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-zinc-500 border-t border-white/5 pt-3">
                    <div>
                      <span className="text-[10px] text-zinc-600 block uppercase tracking-wider">File Size</span>
                      <span className="font-medium text-zinc-300">{formatBytes(d.file_size)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-600 block uppercase tracking-wider">Uploaded By</span>
                      <span className="font-medium text-zinc-300">{d.uploader?.full_name || "Headquarters"}</span>
                    </div>
                    <div className="col-span-2 mt-1">
                      <span className="text-[10px] text-zinc-600 block uppercase tracking-wider">Date Uploaded</span>
                      <span className="font-medium text-zinc-300">
                        {new Date(d.created_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6 pt-4 border-t border-white/5">
                  {previewable && (
                    <button
                      onClick={() => handlePreview(d)}
                      disabled={resolvingPreview === d.id}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/10 hover:text-white transition disabled:opacity-50"
                    >
                      {resolvingPreview === d.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                      Preview
                    </button>
                  )}
                  <button
                    onClick={() => handleDownload(d)}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-violet-600/20 border border-violet-500/30 py-2 text-xs font-semibold text-violet-300 hover:bg-violet-600/30 hover:text-white transition"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </button>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      <AnimatePresence>
        {showUpload && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/90 p-6 shadow-2xl backdrop-blur-xl"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Upload New Document</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Save signed files securely to the document vault.</p>
                </div>
                <button
                  onClick={() => {
                    setShowUpload(false);
                    setSelectedFile(null);
                    setDocTitle("");
                    setDocCategory("agreement");
                  }}
                  className="rounded-full bg-white/5 p-1 text-zinc-400 hover:text-white transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleUpload} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Category</label>
                  <select
                    className="w-full rounded-2xl border border-white/10 bg-zinc-905 bg-zinc-900 px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500"
                    value={docCategory}
                    onChange={(e) => setDocCategory(e.target.value)}
                  >
                    <option value="agreement">Agreement</option>
                    <option value="invoice">Invoice</option>
                    <option value="isbn_certificate">ISBN Certificate</option>
                    <option value="contract">Contract</option>
                    <option value="royalty_statement">Royalty Statement</option>
                    <option value="other">Other Document</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Document Title</label>
                  <input
                    required
                    placeholder="Enter descriptive title"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500"
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Select File</label>
                  {selectedFile ? (
                    <div className="flex items-center justify-between p-3.5 rounded-2xl border border-white/10 bg-white/5">
                      <div className="flex items-center gap-2 overflow-hidden mr-2">
                        <FileText className="h-5 w-5 text-violet-400 shrink-0" />
                        <div className="overflow-hidden">
                          <p className="text-xs font-medium text-white truncate">{selectedFile.name}</p>
                          <p className="text-[10px] text-zinc-500 mt-0.5">{formatBytes(selectedFile.size)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedFile(null)}
                        className="rounded-full bg-white/5 p-1 text-zinc-400 hover:text-white transition"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center p-6 rounded-2xl border border-dashed border-white/15 bg-white/3 hover:bg-white/6 cursor-pointer transition text-zinc-500 hover:text-zinc-300">
                      <Upload className="h-5 w-5 mb-1.5" />
                      <span className="text-xs font-medium">Select PDF or image document</span>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.png,.jpg,.jpeg,.webp,.svg,.doc,.docx,.xls,.xlsx"
                        onChange={handleFileChange}
                      />
                    </label>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={uploading || !selectedFile}
                  className="w-full rounded-2xl bg-violet-600 py-3 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50 transition flex items-center justify-center gap-2 mt-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" /> Save Document
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 p-6 shadow-2xl backdrop-blur-xl flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">{previewDoc.title}</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Secure Document Preview</p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={previewDoc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-white/10 hover:text-white transition"
                  >
                    <Download className="h-3.5 w-3.5" /> Full Window
                  </a>
                  <button
                    onClick={() => setPreviewDoc(null)}
                    className="rounded-full bg-white/5 p-1.5 text-zinc-400 hover:text-white transition"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto bg-zinc-900/50 rounded-2xl border border-white/5 flex items-center justify-center p-4">
                {previewDoc.isImage ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={previewDoc.url}
                    alt={previewDoc.title}
                    className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg"
                  />
                ) : previewDoc.isPdf ? (
                  <iframe
                    src={`${previewDoc.url}#toolbar=0`}
                    title={previewDoc.title}
                    className="w-full h-[65vh] rounded-lg border-0 bg-white"
                  />
                ) : (
                  <div className="text-center py-12 text-zinc-500">
                    <p className="font-semibold">No direct preview available</p>
                    <p className="text-xs text-zinc-600 mt-1">Please download or open in a new window to view this document.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BookSettings({
  book,
  onSave,
  onDeleteRequest,
}: {
  book: Book;
  onSave: () => void;
  onDeleteRequest: () => void;
}) {
  const [form, setForm] = useState({
    title: book.title,
    royalty_percent: book.royalty_percent,
    pricing: book.pricing ?? "",
    launch_date: book.launch_date ?? "",
    expected_publish_date: book.expected_publish_date ?? "",
    isbn: book.isbn ?? "",
    current_stage: book.current_stage,
    progress_percent: book.progress_percent,
    serial_number: book.serial_number ?? "",
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const supabase = createClient();
    
    // Detect changes to notify author
    const changes: string[] = [];
    const criticalChanges: string[] = [];
    
    if (form.current_stage !== book.current_stage) {
      changes.push(`Publishing stage updated to: ${form.current_stage.replace(/_/g, " ")}`);
    }
    if (form.isbn !== (book.isbn ?? "")) {
      changes.push(form.isbn ? `ISBN assigned: ${form.isbn}` : `ISBN removed`);
    }
    if (Number(form.royalty_percent) !== book.royalty_percent) {
      criticalChanges.push(`Royalty rate updated to: ${form.royalty_percent}%`);
    }
    if (form.launch_date !== (book.launch_date ?? "")) {
      criticalChanges.push(form.launch_date ? `Launch date changed to: ${form.launch_date}` : `Launch date cleared`);
    }

    const { error } = await supabase
      .from("books")
      .update({
        title: form.title,
        royalty_percent: Number(form.royalty_percent),
        pricing: form.pricing ? Number(form.pricing) : null,
        launch_date: form.launch_date || null,
        expected_publish_date: form.expected_publish_date || null,
        isbn: form.isbn || null,
        current_stage: form.current_stage,
        progress_percent: Number(form.progress_percent),
        serial_number: form.serial_number || null,
      })
      .eq("id", book.id);

    if (!error) {
      // Send notifications for normal updates
      if (changes.length > 0) {
        await sendNotification({
          userIds: [book.author_id],
          type: "book_update",
          title: "Book Status Updated",
          body: `Admin updated your book "${form.title}": ${changes.join(". ")}.`,
          link: `/author/books/${book.id}`,
        });
      }
      
      // Send notifications for critical updates (royalties, launch date)
      if (criticalChanges.length > 0) {
        await sendNotification({
          userIds: [book.author_id],
          type: "critical", // CRITICAL
          title: "Critical Book Update",
          body: `Important updates were made to your book "${form.title}": ${criticalChanges.join(". ")}.`,
          link: `/author/books/${book.id}`,
        });
      }
    } else {
      console.error("Failed to update book settings:", error);
    }
    
    setSaving(false);
    onSave();
  }

  return (
    <GlassCard className="max-w-2xl space-y-6 p-10">
      {(
        [
          ["title", "Title"],
          ["serial_number", "Serial Number"],
          ["royalty_percent", "Royalty %"],
          ["pricing", "Pricing"],
          ["launch_date", "Launch date"],
          ["expected_publish_date", "Expected publish"],
          ["isbn", "ISBN"],
          ["progress_percent", "Progress %"],
        ] as const
      ).map(([key, label]) => (
        <div key={key}>
          <label className="text-sm text-zinc-500">{label}</label>
          <input
            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
            value={String(form[key as keyof typeof form] ?? "")}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                [key]: key === "serial_number" ? e.target.value.toUpperCase() : e.target.value,
              }))
            }
          />
        </div>
      ))}
      <div>
        <label className="text-sm text-zinc-500">Stage</label>
        <select
          className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
          value={form.current_stage}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              current_stage: e.target.value as Book["current_stage"],
            }))
          }
        >
          {PUBLISHING_STAGES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <button
        onClick={save}
        disabled={saving}
        className="rounded-2xl bg-violet-600 px-8 py-3 font-medium text-white hover:bg-violet-500 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save settings"}
      </button>

      {/* Danger Zone */}
      <div className="border-t border-red-500/20 pt-6 mt-6 space-y-4">
        <h4 className="text-sm font-bold text-red-400 uppercase tracking-wider">Danger Zone</h4>
        <p className="text-xs text-zinc-500">
          Permanently delete this book, its manuscripts, cover designs, and conversations. This action cannot be undone.
        </p>
        <button
          onClick={onDeleteRequest}
          className="rounded-2xl border border-red-500/30 bg-red-500/10 px-6 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-500/20 transition"
        >
          Delete Book Workspace
        </button>
      </div>
    </GlassCard>
  );
}
