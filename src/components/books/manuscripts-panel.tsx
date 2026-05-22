"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { GlassCard } from "@/components/ui/glass-card";
import { ErrorBanner } from "@/components/ui/error-banner";
import { useToast } from "@/components/ui/toast";
import { CommentsDrawer } from "@/components/ui/comments-drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

import { uploadPrivate, resolveFileUrl, storageRef, parseStorageRef } from "@/lib/storage";
import { getErrorMessage } from "@/lib/errors";
import { useRealtimeTable } from "@/hooks/use-realtime";
import { sendNotification } from "@/lib/notifications";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Upload,
  Download,
  Check,
  X,
  Loader2,
  MessageSquare,
  Sparkles,
  RefreshCw,
  FileCode,
  Trash2,
  User,
  Shield,
  Filter,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  PenLine,
  Star,
  ChevronDown,
} from "lucide-react";
import type { ManuscriptVersion, Profile } from "@/lib/types/database";

type FilterType = "all" | "author" | "admin" | "final" | "pending";

type VersionWithUploader = ManuscriptVersion & { uploader?: Profile };

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: {
    label: "Pending Review",
    color: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    icon: <Clock className="h-3 w-3" />,
  },
  approved: {
    label: "Approved",
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  revision_requested: {
    label: "Changes Requested",
    color: "text-orange-400 bg-orange-500/10 border-orange-500/30",
    icon: <AlertCircle className="h-3 w-3" />,
  },
  rejected: {
    label: "Rejected",
    color: "text-red-400 bg-red-500/10 border-red-500/30",
    icon: <XCircle className="h-3 w-3" />,
  },
  under_editing: {
    label: "Under Editing",
    color: "text-blue-400 bg-blue-500/10 border-blue-500/30",
    icon: <PenLine className="h-3 w-3" />,
  },
  finalized: {
    label: "Finalized",
    color: "text-violet-400 bg-violet-500/10 border-violet-500/30",
    icon: <Star className="h-3 w-3" />,
  },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status.replace(/_/g, " "),
    color: "text-zinc-400 bg-zinc-500/10 border-zinc-500/30",
    icon: null,
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${cfg.color}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function UploaderBadge({ role, fallbackIsEditorial = false }: { role?: string; fallbackIsEditorial?: boolean }) {
  const isAdmin = role ? (role === "super_admin" || role === "staff") : fallbackIsEditorial;
  // If we have no role AND no fallback hint, show nothing
  if (!role && !fallbackIsEditorial && !isAdmin) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
        isAdmin
          ? "bg-violet-500/15 text-violet-300 border border-violet-500/30"
          : "bg-blue-500/15 text-blue-300 border border-blue-500/30"
      }`}
    >
      {isAdmin ? <Shield className="h-2.5 w-2.5" /> : <User className="h-2.5 w-2.5" />}
      {isAdmin ? "Editorial" : "Author"}
    </span>
  );
}

function AvatarCircle({ name, role, fallbackIsEditorial = false }: { name?: string; role?: string; fallbackIsEditorial?: boolean }) {
  const isAdmin = role ? (role === "super_admin" || role === "staff") : fallbackIsEditorial;
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";
  return (
    <div
      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
        isAdmin
          ? "bg-violet-500/20 text-violet-300 ring-1 ring-violet-500/40"
          : "bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/40"
      }`}
    >
      {initials}
    </div>
  );
}

// ─── Delete Confirmation Modal ────────────────────────────────────────────────
function DeleteModal({
  open,
  title,
  onCancel,
  onConfirm,
  loading,
}: {
  open: boolean;
  title: string;
  onCancel: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 8 }}
            transition={{ type: "spring", damping: 22, stiffness: 320 }}
            className="w-full max-w-sm overflow-hidden rounded-3xl border border-red-500/20 bg-zinc-950/95 shadow-2xl shadow-red-900/20 backdrop-blur-2xl"
          >
            {/* Danger stripe */}
            <div className="h-1 w-full bg-gradient-to-r from-red-600 via-red-500 to-orange-500" />
            <div className="p-7 space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-2xl bg-red-500/15 border border-red-500/25 flex items-center justify-center shrink-0">
                  <Trash2 className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Permanently Delete?</h3>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{title}</p>
                </div>
              </div>
              <div className="rounded-2xl bg-red-500/5 border border-red-500/15 p-3.5">
                <p className="text-xs text-red-300/80">
                  ⚠️ This action <span className="font-bold text-red-300">cannot be undone</span>. The file will be
                  removed from storage and the database permanently.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onCancel}
                  disabled={loading}
                  className="flex-1 rounded-2xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-zinc-300 hover:bg-white/10 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  disabled={loading}
                  className="flex-1 rounded-2xl bg-red-600 py-3 text-sm font-bold text-white hover:bg-red-500 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Delete Permanently
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─── Version Card ─────────────────────────────────────────────────────────────
function VersionCard({
  v,
  isAdmin,
  isLatest,
  sectionIsEditorial,
  onDownload,
  onComments,
  onViewNotes,
  onDelete,
  onApprove,
  onRevise,
  onReject,
}: {
  v: VersionWithUploader;
  isAdmin: boolean;
  isLatest: boolean;
  /** Which section this card is rendered in — used as fallback when uploader profile is null */
  sectionIsEditorial: boolean;
  onDownload: () => void;
  onComments: () => void;
  onViewNotes: () => void;
  onDelete: () => void;
  onApprove: () => void;
  onRevise: () => void;
  onReject: () => void;
}) {
  // Determine if this is an editorial upload — use the known section context as fallback
  // when the profile join returns null (author cannot read admin profiles via RLS)
  const isAdminUpload =
    v.uploader?.role === "super_admin" || v.uploader?.role === "staff" || (!v.uploader && sectionIsEditorial);

  // Display name fallback: if profile is null and we know it's editorial, show placeholder
  const displayName = v.uploader?.full_name ?? (sectionIsEditorial ? "HQ Editorial Team" : "Author");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`relative rounded-2xl border p-5 space-y-4 transition-all ${
        isAdminUpload
          ? "bg-violet-950/20 border-violet-500/15 hover:border-violet-500/30"
          : "bg-blue-950/15 border-blue-500/15 hover:border-blue-500/25"
      }`}
    >
      {/* Latest badge */}
      {isLatest && (
        <div className="absolute -top-2.5 left-4">
          <span className="text-[9px] font-bold uppercase tracking-widest bg-gradient-to-r from-violet-500 to-blue-500 text-white px-2.5 py-0.5 rounded-full shadow-md shadow-violet-900/30">
            Latest
          </span>
        </div>
      )}

      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <AvatarCircle name={displayName} role={v.uploader?.role} fallbackIsEditorial={sectionIsEditorial} />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold text-white">
                {v.label} <span className="text-zinc-500 font-normal text-xs">(v{v.version_number})</span>
              </p>
              <UploaderBadge role={v.uploader?.role} fallbackIsEditorial={sectionIsEditorial} />
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              by <span className="text-zinc-300 font-medium">{displayName}</span>
              {" · "}
              {new Date(v.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={v.status} />
          {isAdmin && (
            <button
              onClick={onDelete}
              className="w-7 h-7 rounded-lg bg-red-500/0 hover:bg-red-500/15 border border-transparent hover:border-red-500/25 flex items-center justify-center text-zinc-600 hover:text-red-400 transition group"
              title="Delete this version"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* File info */}
      <div className="flex items-center gap-2 rounded-xl bg-white/3 border border-white/5 px-3 py-2">
        <FileText className="h-4 w-4 text-zinc-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-zinc-300 truncate">{v.file_name}</p>
          <p className="text-[10px] text-zinc-600 font-mono">{(v.file_size / (1024 * 1024)).toFixed(2)} MB</p>
        </div>
      </div>

      {/* Notes */}
      {v.notes && (
        <div className="rounded-xl bg-blue-500/5 border border-blue-500/10 p-3 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Author Notes</p>
          <p className="text-xs text-zinc-300 italic leading-relaxed">"{v.notes}"</p>
        </div>
      )}

      {v.admin_comment && (
        <div className="rounded-xl bg-amber-500/5 border border-amber-500/10 p-3 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Editorial Comment</p>
          <p className="text-xs text-amber-200/80 italic leading-relaxed">"{v.admin_comment}"</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          onClick={onDownload}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-medium text-zinc-300 hover:bg-white/10 hover:text-white transition"
        >
          <Download className="h-3.5 w-3.5 text-violet-400" />
          Download
        </button>

        {v.notes && (
          <button
            onClick={onViewNotes}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-medium text-zinc-400 hover:text-white transition"
          >
            <FileText className="h-3.5 w-3.5 text-amber-400" />
            Notes
          </button>
        )}

        <button
          onClick={onComments}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-medium text-zinc-400 hover:text-white transition"
        >
          <MessageSquare className="h-3.5 w-3.5 text-blue-400" />
          Discuss
        </button>

        {/* Admin review actions (only on author-uploaded, pending items) */}
        {isAdmin && v.status === "pending" && !isAdminUpload && (
          <>
            <button
              onClick={onApprove}
              className="inline-flex items-center gap-1 rounded-xl bg-emerald-500/15 border border-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/25 transition"
            >
              <Check className="h-3.5 w-3.5" />
              Approve
            </button>
            <button
              onClick={onRevise}
              className="inline-flex items-center gap-1 rounded-xl bg-amber-500/15 border border-amber-500/20 px-3 py-2 text-xs font-semibold text-amber-400 hover:bg-amber-500/25 transition"
            >
              Request Revision
            </button>
            <button
              onClick={onReject}
              className="inline-flex items-center gap-1 rounded-xl bg-red-500/15 border border-red-500/20 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/25 transition"
            >
              <X className="h-3.5 w-3.5" />
              Reject
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({
  icon,
  title,
  subtitle,
  count,
  accentColor,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  count: number;
  accentColor: "blue" | "violet";
}) {
  return (
    <div
      className={`flex items-center gap-4 p-5 rounded-2xl border ${
        accentColor === "blue"
          ? "bg-blue-950/20 border-blue-500/15"
          : "bg-violet-950/20 border-violet-500/15"
      }`}
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          accentColor === "blue"
            ? "bg-blue-500/15 text-blue-400"
            : "bg-violet-500/15 text-violet-400"
        }`}
      >
        {icon}
      </div>
      <div className="flex-1">
        <h4 className="text-sm font-bold text-white">{title}</h4>
        <p className="text-[11px] text-zinc-500 mt-0.5">{subtitle}</p>
      </div>
      <span
        className={`text-xs font-bold px-2.5 py-1 rounded-full ${
          accentColor === "blue"
            ? "bg-blue-500/15 text-blue-400"
            : "bg-violet-500/15 text-violet-400"
        }`}
      >
        {count} {count === 1 ? "file" : "files"}
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function ManuscriptsPanel({
  bookId,
  isAdmin,
  currentUserId,
}: {
  bookId: string;
  isAdmin: boolean;
  currentUserId: string;
}) {
  const [manuscriptId, setManuscriptId] = useState<string | null>(null);
  const [versions, setVersions] = useState<VersionWithUploader[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [uploadType, setUploadType] = useState<"docx" | "pdf" | "revised" | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [filterOpen, setFilterOpen] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<VersionWithUploader | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [commentThreadId, setCommentThreadId] = useState<string | null>(null);
  const [commentThreadTitle, setCommentThreadTitle] = useState("");
  const [viewNotesVersion, setViewNotesVersion] = useState<VersionWithUploader | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const adminFileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const load = useCallback(async () => {
    setError(null);
    const supabase = createClient();

    const { data: existingMs, error: msErr } = await supabase
      .from("manuscripts")
      .select("id")
      .eq("book_id", bookId);

    if (msErr) {
      setError(msErr.message);
      setLoading(false);
      return;
    }

    if (!existingMs || existingMs.length === 0) {
      setManuscriptId(null);
      setVersions([]);
      setLoading(false);
      return;
    }

    const msIds = existingMs.map((m) => m.id);
    setManuscriptId(msIds[0]);

    const { data: vers, error: versErr } = await supabase
      .from("manuscript_versions")
      .select("*, uploader:profiles(id, full_name, role, avatar_url)")
      .in("manuscript_id", msIds)
      .order("created_at", { ascending: false });

    if (versErr) {
      setError(versErr.message);
    } else {
      setVersions((vers as VersionWithUploader[]) ?? []);
    }
    setLoading(false);
  }, [bookId]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeTable("manuscripts", null, load);
  useRealtimeTable("manuscript_versions", null, load);

  function triggerFileSelect(type: "docx" | "pdf" | "revised") {
    setUploadType(type);
    if (fileInputRef.current) fileInputRef.current.value = "";
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  }

  async function ensureManuscriptId(): Promise<string | null> {
    if (manuscriptId) return manuscriptId;
    const supabase = createClient();
    const { data: created, error: createErr } = await supabase
      .from("manuscripts")
      .insert({ book_id: bookId, title: "Main Manuscript" })
      .select("id");
    if (createErr) throw createErr;
    if (!created || created.length === 0) throw new Error("Could not create manuscript entry");
    setManuscriptId(created[0].id);
    return created[0].id;
  }

  function getNextVersionInfo() {
    const maxVersion = versions.length > 0 ? Math.max(...versions.map((v) => v.version_number)) : 0;
    const next = maxVersion + 1;
    let label = `v${next} Draft`;
    if (next === 1) label = "v1 Original";
    else if (next === 2) label = "v2 Revised";
    else if (next === 3) label = "v3 Edited";
    else if (next === 4) label = "v4 Final";
    return { version: next, label };
  }

  async function handleSendManuscript(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) {
      toast.error("Please choose a file to upload.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const supabase = createClient();
      const msId = await ensureManuscriptId();
      if (!msId) throw new Error("Manuscript ID not available");

      const path = `${bookId}/${Date.now()}-${selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { path: storedPath } = await uploadPrivate("manuscripts", path, selectedFile);
      const fileRef = storageRef("manuscripts", storedPath);

      const { version: nextVersion, label: versionLabel } = getNextVersionInfo();

      const { error: insertErr } = await supabase.from("manuscript_versions").insert({
        manuscript_id: msId,
        version_number: nextVersion,
        label: versionLabel,
        file_url: fileRef,
        file_name: selectedFile.name,
        file_type: selectedFile.type || "application/octet-stream",
        file_size: selectedFile.size,
        uploaded_by: currentUserId,
        status: "pending",
        notes: notes.trim() || null,
      });
      if (insertErr) throw insertErr;

      await supabase.from("activity_logs").insert({
        book_id: bookId,
        user_id: currentUserId,
        action: "manuscript_uploaded",
        entity_type: "manuscript",
        metadata: { version: nextVersion, label: versionLabel },
      });

      const { data: bookData } = await supabase.from("books").select("title").eq("id", bookId).single();
      const bookTitle = bookData?.title || "Untitled Book";
      const { data: admins } = await supabase.from("profiles").select("id").eq("role", "super_admin");
      if (admins && admins.length > 0) {
        await sendNotification({
          userIds: admins.map((admin) => admin.id),
          type: "manuscript",
          title: "New Manuscript Uploaded",
          body: `Author uploaded revised manuscript ${versionLabel} for book: ${bookTitle}.`,
          link: `/admin/books/${bookId}`,
        });
      }

      toast.success("Manuscript submitted successfully!");
      setSelectedFile(null);
      setNotes("");
      setUploadType(null);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
      toast.error("Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleAdminUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !isAdmin) return;
    setUploading(true);
    setError(null);
    try {
      const supabase = createClient();
      const msId = await ensureManuscriptId();
      if (!msId) throw new Error("Manuscript ID not available");

      const path = `${bookId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { path: storedPath } = await uploadPrivate("manuscripts", path, file);
      const fileRef = storageRef("manuscripts", storedPath);

      const { version: nextVersion, label } = getNextVersionInfo();

      const { error: insertErr } = await supabase.from("manuscript_versions").insert({
        manuscript_id: msId,
        version_number: nextVersion,
        label,
        file_url: fileRef,
        file_name: file.name,
        file_type: file.type || "application/octet-stream",
        file_size: file.size,
        uploaded_by: currentUserId,
        status: "approved",
      });
      if (insertErr) throw insertErr;

      await supabase.from("activity_logs").insert({
        book_id: bookId,
        user_id: currentUserId,
        action: "manuscript_uploaded",
        entity_type: "manuscript",
        metadata: { version: nextVersion, label },
      });

      await supabase.from("books").update({ current_stage: "editing" }).eq("id", bookId);

      const { data: bookData } = await supabase.from("books").select("title, author_id").eq("id", bookId).single();
      if (bookData) {
        await sendNotification({
          userIds: [bookData.author_id],
          type: "manuscript",
          title: "Edited Manuscript Available",
          body: `HQ Editor uploaded an edited draft (${label}) for your book: ${bookData.title || "Untitled Book"}.`,
          link: `/author/books/${bookId}`,
        });
      }

      toast.success("Edited draft uploaded successfully!");
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
      toast.error("Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function updateStatus(
    versionId: string,
    status: "approved" | "rejected" | "revision_requested",
    comment?: string
  ) {
    setError(null);
    try {
      const supabase = createClient();
      const currentVer = versions.find((v) => v.id === versionId);
      if (!currentVer) return;

      const { error: err } = await supabase
        .from("manuscript_versions")
        .update({ status, admin_comment: comment ?? null })
        .eq("id", versionId);
      if (err) throw err;

      if (status === "approved" && currentVer.version_number === 4) {
        await supabase.from("books").update({ current_stage: "designing" }).eq("id", bookId);
      }

      await supabase.from("activity_logs").insert({
        book_id: bookId,
        user_id: currentUserId,
        action: `manuscript_version_${status}`,
        entity_type: "manuscript",
        metadata: { version_id: versionId, version: currentVer.version_number },
      });

      const { data: bookData } = await supabase.from("books").select("title, author_id").eq("id", bookId).single();
      if (bookData) {
        const isCritical = status === "approved" || status === "revision_requested";
        await sendNotification({
          userIds: [bookData.author_id],
          type: isCritical ? "critical" : "manuscript_status",
          title: `Manuscript ${status === "approved" ? "Approved" : status === "revision_requested" ? "Revision Requested" : "Feedback"}`,
          body: `HQ editors have completed the review of Draft v${currentVer.version_number} for your book: ${bookData.title || "Untitled Book"}. Status: ${status.replace(/_/g, " ")}.`,
          link: `/author/books/${bookId}`,
        });
      }

      toast.success(`Status updated to: ${status.replace(/_/g, " ")}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error updating status");
      toast.error("Failed to update status.");
    }
  }

  async function handleDelete() {
    if (!deleteTarget || !isAdmin) return;
    setDeleting(true);
    try {
      const supabase = createClient();

      // Delete from storage
      const ref = parseStorageRef(deleteTarget.file_url);
      if (ref) {
        await supabase.storage.from(ref.bucket).remove([ref.path]);
      }

      // Delete from DB
      const { error: dbErr } = await supabase
        .from("manuscript_versions")
        .delete()
        .eq("id", deleteTarget.id);
      if (dbErr) throw dbErr;

      // Log activity
      await supabase.from("activity_logs").insert({
        book_id: bookId,
        user_id: currentUserId,
        action: "manuscript_deleted",
        entity_type: "manuscript",
        metadata: {
          version_id: deleteTarget.id,
          version: deleteTarget.version_number,
          file_name: deleteTarget.file_name,
        },
      });

      toast.success("Manuscript version deleted.");
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
      toast.error("Delete failed.");
    } finally {
      setDeleting(false);
    }
  }

  async function openFile(fileUrl: string) {
    try {
      const ref = parseStorageRef(fileUrl);
      const url = ref
        ? await resolveFileUrl(ref.path, ref.bucket)
        : await resolveFileUrl(fileUrl, "manuscripts");
      window.open(url, "_blank");
    } catch (err) {
      setError(getErrorMessage(err));
      toast.error("Could not open file.");
    }
  }

  // ─── Filtered versions split by role ────────────────────────────────────────
  // NOTE: When an author views this panel, the Supabase profiles join may return
  // null for admin-uploaded versions (cross-role RLS on profiles). We therefore
  // split purely on: is the uploader explicitly an author? If not → editorial side.
  const filteredVersions = versions.filter((v) => {
    if (filter === "author") return v.uploader?.role === "author";
    // For admin filter, include null uploader (cannot read admin profile from author context)
    if (filter === "admin") return v.uploader?.role !== "author";
    if (filter === "final") return v.status === "approved" || v.status === "finalized";
    if (filter === "pending") return v.status === "pending" || v.status === "under_editing";
    return true;
  });

  // Author uploads: explicitly role === 'author'
  const authorVersions = filteredVersions.filter((v) => v.uploader?.role === "author");
  // Editorial uploads: everything else (super_admin, staff, OR null when profile join fails)
  const adminVersions = filteredVersions.filter((v) => v.uploader?.role !== "author");

  const latestId = versions[0]?.id;

  const FILTER_OPTIONS: { key: FilterType; label: string }[] = [
    { key: "all", label: "All Files" },
    { key: "author", label: "Author Uploads" },
    { key: "admin", label: "Admin Uploads" },
    { key: "final", label: "Final Versions" },
    { key: "pending", label: "Pending Reviews" },
  ];

  // ─── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3 w-64" />
            </div>
          </div>
          <Skeleton className="w-28 h-9 rounded-xl" />
        </div>
        
        {/* Two Columns Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Column A */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3.5 rounded-2xl border border-white/5 bg-zinc-950/20">
              <div className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-lg" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="p-5 rounded-2xl border border-white/5 bg-zinc-950/20 space-y-4">
                  <div className="flex justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="w-16 h-5 rounded-full" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-9 flex-1 rounded-xl" />
                    <Skeleton className="h-9 flex-1 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column B */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3.5 rounded-2xl border border-white/5 bg-zinc-950/20">
              <div className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-lg" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {[1].map((i) => (
                <div key={i} className="p-5 rounded-2xl border border-white/5 bg-zinc-950/20 space-y-4">
                  <div className="flex justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="w-16 h-5 rounded-full" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-9 flex-1 rounded-xl" />
                    <Skeleton className="h-9 flex-1 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <ErrorBanner message={error ?? ""} onDismiss={() => setError(null)} />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl border border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-violet-500/20 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Manuscript Editorial Hub</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              {versions.length} version{versions.length !== 1 ? "s" : ""} · Author submissions on the left,
              editorial responses on the right
            </p>
          </div>
        </div>

        {/* Filter */}
        <div className="relative">
          <button
            onClick={() => setFilterOpen((p) => !p)}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-white/8 transition"
          >
            <Filter className="h-3.5 w-3.5 text-violet-400" />
            {FILTER_OPTIONS.find((f) => f.key === filter)?.label ?? "All Files"}
            <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
          </button>
          <AnimatePresence>
            {filterOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.97 }}
                className="absolute right-0 top-full mt-2 w-44 rounded-2xl border border-white/10 bg-zinc-950/95 backdrop-blur-xl shadow-2xl z-50 overflow-hidden py-1"
              >
                {FILTER_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => {
                      setFilter(opt.key);
                      setFilterOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-xs font-medium transition ${
                      filter === opt.key
                        ? "text-violet-300 bg-violet-500/10"
                        : "text-zinc-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Two-column workflow layout ──────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION A — AUTHOR DRAFT SUBMISSIONS
            ═══════════════════════════════════════════════════════════════════ */}
        <div className="space-y-4">
          <SectionHeader
            icon={<User className="h-5 w-5" />}
            title="Author Draft Submissions"
            subtitle="Original drafts & revisions submitted by the author"
            count={authorVersions.length}
            accentColor="blue"
          />

          {/* Author upload form (visible only to authors) */}
          {!isAdmin && (
            <div className="rounded-2xl border border-blue-500/15 bg-blue-950/10 p-5 space-y-4">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-400">Submit a New Draft</p>
              <div className="grid grid-cols-3 gap-2">
                {(["docx", "pdf", "revised"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => triggerFileSelect(type)}
                    className={`py-2.5 px-2 text-xs font-semibold rounded-xl border flex items-center justify-center gap-1.5 transition ${
                      uploadType === type
                        ? "bg-blue-600/25 border-blue-500 text-white"
                        : "bg-white/3 border-white/8 text-zinc-400 hover:bg-white/6 hover:text-zinc-200"
                    }`}
                  >
                    {type === "docx" ? (
                      <FileCode className="h-3.5 w-3.5" />
                    ) : type === "pdf" ? (
                      <FileText className="h-3.5 w-3.5" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                    {type === "docx" ? "DOCX" : type === "pdf" ? "PDF" : "Revised"}
                  </button>
                ))}
              </div>

              {selectedFile && (
                <div className="rounded-xl border border-blue-500/20 bg-blue-600/8 p-3 flex items-center justify-between">
                  <div className="truncate pr-2">
                    <p className="text-xs font-semibold text-white truncate">{selectedFile.name}</p>
                    <p className="text-[10px] text-zinc-500">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                  <button onClick={() => setSelectedFile(null)} className="text-zinc-500 hover:text-white">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {selectedFile && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Version Notes (optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes about this draft — key changes, questions for the editor..."
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-3.5 text-sm text-white placeholder-zinc-600 min-h-[80px] focus:outline-none focus:border-blue-500 resize-none"
                  />
                  <button
                    onClick={handleSendManuscript}
                    disabled={uploading}
                    className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-500 disabled:opacity-50 transition flex items-center justify-center gap-2"
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Submit Manuscript
                  </button>
                </div>
              )}

              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
              />
            </div>
          )}

          {/* Author versions list */}
          {authorVersions.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No submissions yet"
              description={
                isAdmin
                  ? "The author has not submitted any manuscript drafts yet."
                  : "Submit your original manuscript draft or revision above to kick off editorial review."
              }
              color="blue"
              action={
                !isAdmin ? (
                  <button
                    onClick={() => triggerFileSelect("docx")}
                    className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-500 transition shadow-lg shadow-blue-500/15"
                  >
                    Upload DOCX Draft
                  </button>
                ) : undefined
              }
            />
          ) : (
            <div className="space-y-3">
              {authorVersions.map((v) => (
                <VersionCard
                  key={v.id}
                  v={v}
                  isAdmin={isAdmin}
                  isLatest={v.id === latestId}
                  sectionIsEditorial={false}
                  onDownload={() => openFile(v.file_url)}
                  onComments={() => {
                    setCommentThreadId(v.id);
                    setCommentThreadTitle(`Discussion — Draft v${v.version_number}`);
                  }}
                  onViewNotes={() => setViewNotesVersion(v)}
                  onDelete={() => setDeleteTarget(v)}
                  onApprove={() => updateStatus(v.id, "approved")}
                  onRevise={() => {
                    const note = prompt("Enter revision feedback for author:");
                    if (note !== null) updateStatus(v.id, "revision_requested", note);
                  }}
                  onReject={() => {
                    const note = prompt("Enter reason for rejection:");
                    if (note !== null) updateStatus(v.id, "rejected", note);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION B — EDITORIAL / ADMIN RESPONSES
            ═══════════════════════════════════════════════════════════════════ */}
        <div className="space-y-4">
          <SectionHeader
            icon={<Shield className="h-5 w-5" />}
            title="Editorial Responses & Edited Versions"
            subtitle="Files uploaded by HQ editors & approved versions"
            count={adminVersions.length}
            accentColor="violet"
          />

          {/* Admin upload form (visible only to admins) */}
          {isAdmin && (
            <div className="rounded-2xl border border-violet-500/15 bg-violet-950/10 p-5 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-violet-400">Upload Edited Version</p>
              <label className="flex items-center justify-center gap-2 w-full rounded-xl border border-dashed border-violet-500/25 bg-violet-500/5 py-4 text-xs font-semibold text-violet-400 hover:bg-violet-500/10 cursor-pointer transition">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Upload Edited Manuscript (HQ)
                <input
                  type="file"
                  ref={adminFileInputRef}
                  className="hidden"
                  accept=".pdf,.doc,.docx"
                  onChange={handleAdminUpload}
                  disabled={uploading}
                />
              </label>
            </div>
          )}

          {/* Editorial versions list */}
          {adminVersions.length === 0 ? (
            <EmptyState
              icon={Shield}
              title="No editorial drafts yet"
              description={
                isAdmin
                  ? "Upload the edited manuscript version to provide revisions to the author."
                  : "HQ editorial team is reviewing your manuscript. Revisions and feedback will appear here."
              }
              color="violet"
              action={
                isAdmin ? (
                  <button
                    onClick={() => adminFileInputRef.current?.click()}
                    className="rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-violet-500 transition shadow-lg shadow-violet-500/15"
                  >
                    Upload Edited DOCX
                  </button>
                ) : undefined
              }
            />
          ) : (
            <div className="space-y-3">
              {adminVersions.map((v) => (
                <VersionCard
                  key={v.id}
                  v={v}
                  isAdmin={isAdmin}
                  isLatest={v.id === latestId}
                  sectionIsEditorial={true}
                  onDownload={() => openFile(v.file_url)}
                  onComments={() => {
                    setCommentThreadId(v.id);
                    setCommentThreadTitle(`Discussion — Editorial v${v.version_number}`);
                  }}
                  onViewNotes={() => setViewNotesVersion(v)}
                  onDelete={() => setDeleteTarget(v)}
                  onApprove={() => updateStatus(v.id, "approved")}
                  onRevise={() => {
                    const note = prompt("Enter revision feedback:");
                    if (note !== null) updateStatus(v.id, "revision_requested", note);
                  }}
                  onReject={() => {
                    const note = prompt("Enter reason for rejection:");
                    if (note !== null) updateStatus(v.id, "rejected", note);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Delete Confirmation Modal ───────────────────────────────────────── */}
      <DeleteModal
        open={!!deleteTarget}
        title={`Are you sure you want to permanently delete "${deleteTarget?.file_name}" (${deleteTarget?.label})?`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
      />

      {/* ── Comments Drawer ─────────────────────────────────────────────────── */}
      <CommentsDrawer
        threadId={commentThreadId || ""}
        type="author_editor"
        bookId={bookId}
        currentUserId={currentUserId}
        title={commentThreadTitle}
        isOpen={!!commentThreadId}
        onClose={() => setCommentThreadId(null)}
      />

      {/* ── Notes Modal ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {viewNotesVersion && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/95 p-6 shadow-2xl backdrop-blur-xl"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-5">
                <div>
                  <h3 className="text-base font-bold text-white">Version Notes</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">{viewNotesVersion.label}</p>
                </div>
                <button
                  onClick={() => setViewNotesVersion(null)}
                  className="rounded-full bg-white/5 p-2 text-zinc-400 hover:text-white transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-4">
                {viewNotesVersion.notes ? (
                  <div className="rounded-2xl border border-white/5 bg-white/3 p-4">
                    <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">
                      "{viewNotesVersion.notes}"
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500 italic">No notes provided for this version.</p>
                )}
                <div className="flex justify-between text-xs text-zinc-500 border-t border-white/5 pt-3 font-mono">
                  <span>{viewNotesVersion.uploader?.full_name ?? "Unknown"}</span>
                  <span>{new Date(viewNotesVersion.created_at).toLocaleDateString()}</span>
                </div>
                <button
                  onClick={() => setViewNotesVersion(null)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-white hover:bg-white/10 transition"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
