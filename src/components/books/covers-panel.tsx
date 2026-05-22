"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { ErrorBanner } from "@/components/ui/error-banner";
import { useToast } from "@/components/ui/toast";
import { CommentsDrawer } from "@/components/ui/comments-drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

import { uploadPrivate, uploadPublic, resolveFileUrl, storageRef, parseStorageRef } from "@/lib/storage";
import { getErrorMessage } from "@/lib/errors";
import { useRealtimeTable } from "@/hooks/use-realtime";
import { sendNotification } from "@/lib/notifications";
import type { CoverDesign, Profile } from "@/lib/types/database";
import { motion, AnimatePresence } from "framer-motion";
import {
  ImageIcon,
  Upload,
  Check,
  Loader2,
  Send,
  MessageSquare,
  Sparkles,
  FileText,
  X,
  Trash2,
  User,
  Shield,
  Filter,
  Clock,
  CheckCircle2,
  AlertCircle,
  Star,
  ChevronDown,
  PenLine,
  Eye,
  RefreshCw,
} from "lucide-react";

type FilterType = "all" | "author" | "admin" | "final" | "pending";
type CoverRef = {
  id: string;
  image_url: string;
  description: string | null;
  created_at: string;
  uploader?: Profile;
};
type DesignWithUploader = CoverDesign & { uploader?: Profile };

// ─── Status Config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft: {
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
  finalized: {
    label: "Finalized",
    color: "text-violet-400 bg-violet-500/10 border-violet-500/30",
    icon: <Star className="h-3 w-3" />,
  },
  under_editing: {
    label: "Under Design",
    color: "text-blue-400 bg-blue-500/10 border-blue-500/30",
    icon: <PenLine className="h-3 w-3" />,
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
                  ⚠️ This action <span className="font-bold text-red-300">cannot be undone</span>. The file and its
                  record will be permanently removed.
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
        {count} {count === 1 ? "item" : "items"}
      </span>
    </div>
  );
}

// ─── Cover Ref Card (Author Requests) ────────────────────────────────────────
function CoverRefCard({
  coverRef: r,
  imageUrl,
  isAdmin,
  onDelete,
}: {
  coverRef: CoverRef;
  imageUrl?: string;
  isAdmin: boolean;
  onDelete: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-blue-500/15 bg-blue-950/15 overflow-hidden"
    >
      {/* Reference image */}
      {r.image_url && imageUrl && (
        <div className="relative aspect-video bg-zinc-950">
          <Image src={imageUrl} alt="Reference" fill className="object-cover opacity-80" unoptimized />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute top-2 left-2">
            <span className="text-[9px] font-bold uppercase tracking-widest bg-blue-600/80 text-white px-2 py-0.5 rounded-full">
              Reference Image
            </span>
          </div>
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center text-[10px] font-bold">
              {r.uploader?.full_name ? r.uploader.full_name[0].toUpperCase() : "A"}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-zinc-300">
                {r.uploader?.full_name || "Author Account"}
              </span>
              <span className="text-[8px] uppercase tracking-wider text-blue-400 font-semibold">
                Creator
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </span>
            {isAdmin && (
              <button
                onClick={onDelete}
                className="w-6 h-6 rounded-lg hover:bg-red-500/15 flex items-center justify-center text-zinc-600 hover:text-red-400 transition"
                title="Delete this request"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Description / brief */}
        {r.description && (
          <div className="rounded-xl bg-white/3 border border-white/5 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Cover Brief</p>
            <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">"{r.description}"</p>
          </div>
        )}

        {!r.image_url && !r.description && (
          <p className="text-xs text-zinc-600 italic">Empty submission</p>
        )}

        {/* Status */}
        <div className="flex items-center gap-2">
          <Clock className="h-3 w-3 text-amber-400" />
          <span className="text-[10px] text-amber-400 font-semibold">Pending Design Team Response</span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Cover Design Card (Admin Responses) ─────────────────────────────────────
function CoverDesignCard({
  design: d,
  imageUrl,
  isAdmin,
  isLatest,
  activeFeedbackId,
  feedbackText,
  onFeedbackChange,
  onFeedbackOpen,
  onFeedbackCancel,
  onApprove,
  onRequestChanges,
  onComments,
  onDelete,
}: {
  design: DesignWithUploader;
  imageUrl?: string;
  isAdmin: boolean;
  isLatest: boolean;
  activeFeedbackId: string | null;
  feedbackText: Record<string, string>;
  onFeedbackChange: (id: string, text: string) => void;
  onFeedbackOpen: (id: string) => void;
  onFeedbackCancel: () => void;
  onApprove: (id: string) => void;
  onRequestChanges: (id: string, feedback: string) => void;
  onComments: (id: string, version: number) => void;
  onDelete: (design: CoverDesign) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border overflow-hidden flex flex-col ${
        d.is_final
          ? "border-emerald-500/30 bg-emerald-950/10"
          : "border-violet-500/15 bg-violet-950/15"
      }`}
    >
      {/* Cover image */}
      <div className="relative aspect-[3/4] bg-zinc-950 group">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={`Design v${d.version_number}`}
            fill
            className="object-cover transition duration-300 group-hover:scale-[1.02]"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-700" />
          </div>
        )}

        {/* Overlay badges */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

        {isLatest && !d.is_final && d.status === "draft" && !isAdmin && (
          <div className="absolute top-3 left-3 flex gap-1.5 z-10">
            <span className="text-[9px] font-bold uppercase tracking-widest bg-gradient-to-r from-violet-500 to-blue-500 text-white px-2.5 py-0.5 rounded-full shadow-md">
              Latest
            </span>
            <span className="text-[9px] font-bold uppercase tracking-widest bg-amber-500 text-black px-2.5 py-0.5 rounded-full shadow-md animate-pulse">
              Requires Review
            </span>
          </div>
        )}

        {isLatest && !d.is_final && (d.status !== "draft" || isAdmin) && (
          <div className="absolute top-3 left-3 z-10">
            <span className="text-[9px] font-bold uppercase tracking-widest bg-gradient-to-r from-violet-500 to-blue-500 text-white px-2.5 py-0.5 rounded-full shadow-md">
              Latest
            </span>
          </div>
        )}

        {d.is_final && (
          <div className="absolute top-3 right-3 z-10">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500 text-white px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
              <Check className="h-3 w-3" /> Final Cover
            </span>
          </div>
        )}

        <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
          <div className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-300 flex items-center justify-center">
            <Shield className="h-2.5 w-2.5" />
          </div>
        </div>

        {/* Version label at bottom */}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between z-10">
          <div>
            <p className="text-sm font-bold text-white drop-shadow">Design v{d.version_number}</p>
            <p className="text-[10px] text-white/60">
              {new Date(d.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <StatusBadge status={d.status} />
        </div>
      </div>

      {/* Card body */}
      <div className="p-4 space-y-3 flex-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-violet-500/20 text-violet-300 flex items-center justify-center text-[10px] font-bold">
              {d.uploader?.full_name ? d.uploader.full_name[0].toUpperCase() : "E"}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-zinc-300">
                {d.uploader?.full_name || "Editorial Staff"}
              </span>
              <span className="text-[8px] uppercase tracking-wider text-violet-400 font-semibold">
                {d.uploader?.role === "super_admin" || d.uploader?.role === "staff" ? "Designer / Admin" : "Editorial"}
              </span>
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={() => onDelete(d)}
              className="w-7 h-7 rounded-lg hover:bg-red-500/15 border border-transparent hover:border-red-500/20 flex items-center justify-center text-zinc-600 hover:text-red-400 transition"
              title="Delete this design"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Author feedback */}
        {d.author_feedback && (
          <div className="rounded-xl bg-amber-500/5 border border-amber-500/15 p-3 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Author Feedback</p>
            <p className="text-xs text-amber-200/80 italic leading-relaxed">"{d.author_feedback}"</p>
          </div>
        )}

        {/* Admin notes */}
        {d.admin_notes && (
          <div className="rounded-xl bg-violet-500/5 border border-violet-500/10 p-3 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-violet-400">Designer Notes</p>
            <p className="text-xs text-zinc-300 leading-relaxed">{d.admin_notes}</p>
          </div>
        )}

        {/* Author action buttons */}
        {!isAdmin && d.status === "draft" && (
          <div className="space-y-2">
            {activeFeedbackId === d.id ? (
              <div className="space-y-2">
                <textarea
                  value={feedbackText[d.id] ?? ""}
                  onChange={(e) => onFeedbackChange(d.id, e.target.value)}
                  placeholder="Describe exactly what changes you need..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white min-h-[70px] focus:outline-none focus:border-amber-500 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => onRequestChanges(d.id, feedbackText[d.id] ?? "")}
                    className="flex-1 rounded-xl bg-amber-500/15 border border-amber-500/20 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/25 transition"
                  >
                    Send Feedback
                  </button>
                  <button
                    onClick={onFeedbackCancel}
                    className="px-3 rounded-xl bg-white/5 border border-white/10 text-zinc-400 text-xs hover:bg-white/10 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => onApprove(d.id)}
                  className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-white hover:bg-emerald-400 transition flex items-center justify-center gap-1"
                >
                  <Check className="h-3.5 w-3.5" /> Approve Cover
                </button>
                <button
                  onClick={() => onFeedbackOpen(d.id)}
                  className="flex-1 rounded-xl bg-white/5 border border-white/10 py-2.5 text-xs font-medium text-zinc-300 hover:bg-white/10 transition flex items-center justify-center gap-1"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Request Changes
                </button>
              </div>
            )}
          </div>
        )}

        {/* View in lightbox + Comments */}
        <div className="flex gap-2">
          <button
            onClick={() => window.open(imageUrl, "_blank")}
            disabled={!imageUrl}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 py-2 text-xs font-medium text-zinc-400 hover:text-white transition disabled:opacity-40"
          >
            <Eye className="h-3.5 w-3.5" /> Preview
          </button>
          <button
            onClick={() => onComments(d.id, d.version_number)}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 py-2 text-xs font-medium text-zinc-400 hover:text-white transition"
          >
            <MessageSquare className="h-3.5 w-3.5" /> Discuss
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function CoversPanel({
  bookId,
  isAdmin,
  currentUserId,
}: {
  bookId: string;
  isAdmin: boolean;
  currentUserId: string;
}) {
  const [designs, setDesigns] = useState<DesignWithUploader[]>([]);
  const [refs, setRefs] = useState<CoverRef[]>([]);
  const [briefText, setBriefText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState<Record<string, string>>({});
  const [activeFeedbackId, setActiveFeedbackId] = useState<string | null>(null);
  const [commentThreadId, setCommentThreadId] = useState<string | null>(null);
  const [commentThreadTitle, setCommentThreadTitle] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [filterOpen, setFilterOpen] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [uploadingDraft, setUploadingDraft] = useState(false);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<
    | { type: "design"; item: CoverDesign }
    | { type: "ref"; item: CoverRef }
    | null
  >(null);
  const [deleting, setDeleting] = useState(false);

  const toast = useToast();

  const resolveImages = useCallback(async (items: { id: string; image_url: string }[]) => {
    const urls: Record<string, string> = {};
    for (const item of items) {
      try {
        const ref = parseStorageRef(item.image_url);
        if (ref?.bucket) {
          urls[item.id] = await resolveFileUrl(ref.path, ref.bucket);
        } else {
          urls[item.id] = item.image_url.startsWith("http")
            ? item.image_url
            : await resolveFileUrl(item.image_url, "cover-designs");
        }
      } catch {
        urls[item.id] = item.image_url;
      }
    }
    setImageUrls((prev) => ({ ...prev, ...urls }));
  }, []);

  const load = useCallback(async () => {
    setError(null);
    const supabase = createClient();
    const [{ data: d, error: dErr }, { data: r, error: rErr }] = await Promise.all([
      supabase
        .from("cover_designs")
        .select("*, uploader:profiles(*)")
        .eq("book_id", bookId)
        .order("version_number", { ascending: false }),
      supabase
        .from("cover_references")
        .select("*, uploader:profiles(*)")
        .eq("book_id", bookId)
        .order("created_at", { ascending: false }),
    ]);
    if (dErr) setError(dErr.message);
    if (rErr) setError(rErr.message);

    const designsData = (d as any[]) ?? [];
    const refsData = (r as any[]) ?? [];

    setDesigns(designsData);
    setRefs(refsData);

    if (designsData.length) resolveImages(designsData);
    if (refsData.length) resolveImages(refsData);
    setLoading(false);
  }, [bookId, resolveImages]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeTable("cover_designs", { column: "book_id", value: bookId }, load);
  useRealtimeTable("cover_references", { column: "book_id", value: bookId }, load);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setFilePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!briefText.trim() && !selectedFile) {
      toast.error("Please provide a design brief or a reference image.");
      return;
    }
    setSubmittingRequest(true);
    setError(null);
    try {
      const supabase = createClient();
      let publicUrl = "";

      if (selectedFile) {
        const { publicUrl: uploadedUrl } = await uploadPublic(
          "book-covers",
          currentUserId,
          selectedFile,
          `${bookId}/ref-`
        );
        publicUrl = uploadedUrl;
      }

      const { error: insertErr } = await supabase.from("cover_references").insert({
        book_id: bookId,
        image_url: publicUrl || "",
        description: briefText.trim() || null,
        uploaded_by: currentUserId,
      });
      if (insertErr) throw insertErr;

      await supabase.from("activity_logs").insert({
        book_id: bookId,
        user_id: currentUserId,
        action: "cover_brief_submitted",
        entity_type: "cover",
        metadata: { has_image: !!publicUrl },
      });

      const { data: bookData } = await supabase.from("books").select("title, author:profiles(full_name)").eq("id", bookId).single();
      const bookTitle = bookData?.title || "Untitled Book";
      const authorName = (bookData as any)?.author?.full_name || "Author";
      const { data: admins } = await supabase.from("profiles").select("id").eq("role", "super_admin");
      if (admins && admins.length > 0) {
        await sendNotification({
          userIds: admins.map((admin) => admin.id),
          type: "cover_request",
          title: "New Cover Design Brief",
          body: `${authorName} submitted a cover design brief for book: ${bookTitle}.`,
          link: `/admin/books/${bookId}`,
        });
      }

      toast.success("Cover request submitted!");
      setBriefText("");
      setSelectedFile(null);
      setFilePreview(null);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
      toast.error("Failed to submit request.");
    } finally {
      setSubmittingRequest(false);
    }
  }

  async function uploadDesign(e: React.ChangeEvent<HTMLInputElement>, isFinal = false) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !isAdmin) return;
    setUploadingDraft(true);
    setError(null);
    try {
      const path = `${bookId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { path: storedPath } = await uploadPrivate("cover-designs", path, file);
      const supabase = createClient();
      const nextVersion = (designs[0]?.version_number ?? 0) + 1;
      const fileRef = storageRef("cover-designs", storedPath);

      const { error: err } = await supabase.from("cover_designs").insert({
        book_id: bookId,
        version_number: nextVersion,
        image_url: fileRef,
        uploaded_by: currentUserId,
        status: isFinal ? "approved" : "draft",
        is_final: isFinal,
      });
      if (err) throw err;

      await supabase.from("activity_logs").insert({
        book_id: bookId,
        user_id: currentUserId,
        action: isFinal ? "final_cover_uploaded" : "cover_draft_uploaded",
        entity_type: "cover",
        metadata: { version: nextVersion },
      });

      if (isFinal) {
        const resolved = await resolveFileUrl(storedPath, "cover-designs");
        await supabase.from("books").update({ cover_url: resolved }).eq("id", bookId);
        const { data: bookData } = await supabase.from("books").select("title, author_id").eq("id", bookId).single();
        if (bookData) {
          await sendNotification({
            userIds: [bookData.author_id],
            type: "success",
            title: "Final Cover Published",
            body: `Admin published the final cover for your book: ${bookData.title || "Untitled Book"}.`,
            link: `/author/books/${bookId}`,
          });
        }
      } else {
        const { data: bookData } = await supabase.from("books").select("title, author_id").eq("id", bookId).single();
        if (bookData) {
          await sendNotification({
            userIds: [bookData.author_id],
            type: "critical", // CRITICAL: cover approval required
            title: "New Cover Draft Available",
            body: `Admin uploaded Cover Draft v${nextVersion} for book: ${bookData.title || "Untitled Book"}. Please review and approve it.`,
            link: `/author/books/${bookId}`,
          });
        }
      }

      toast.success(isFinal ? "Final cover published!" : "Draft uploaded successfully!");
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
      toast.error("Upload failed.");
    } finally {
      setUploadingDraft(false);
    }
  }

  async function handleAuthorAction(id: string, status: "approved" | "revision_requested", feedback?: string) {
    setError(null);
    try {
      const supabase = createClient();
      const currentDesign = designs.find((d) => d.id === id);
      if (!currentDesign) return;

      const { error: err } = await supabase
        .from("cover_designs")
        .update({ status, author_feedback: feedback || null })
        .eq("id", id);
      if (err) throw err;

      if (status === "approved") {
        const ref = parseStorageRef(currentDesign.image_url);
        const resolvedUrl = ref ? await resolveFileUrl(ref.path, ref.bucket) : currentDesign.image_url;
        await supabase.from("books").update({ cover_url: resolvedUrl }).eq("id", bookId);
        await supabase.from("cover_designs").update({ is_final: true }).eq("id", id);
      }

      await supabase.from("activity_logs").insert({
        book_id: bookId,
        user_id: currentUserId,
        action: `cover_draft_${status}`,
        entity_type: "cover",
        metadata: { design_id: id, version: currentDesign.version_number },
      });

      const { data: bookData } = await supabase.from("books").select("title, author:profiles(full_name)").eq("id", bookId).single();
      const bookTitle = bookData?.title || "Untitled Book";
      const authorName = (bookData as any)?.author?.full_name || "Author";
      const { data: admins } = await supabase.from("profiles").select("id").eq("role", "super_admin");
      if (admins && admins.length > 0) {
        await sendNotification({
          userIds: admins.map((admin) => admin.id),
          type: status === "approved" ? "success" : "warning",
          title: `Cover Draft v${currentDesign.version_number} ${status === "approved" ? "Approved" : "Feedback"}`,
          body: `${authorName} has ${status === "approved" ? "approved" : "requested changes for"} Cover Draft v${currentDesign.version_number} for book: ${bookTitle}.`,
          link: `/admin/books/${bookId}`,
        });
      }

      toast.success(status === "approved" ? "Cover design approved!" : "Feedback sent to design team.");
      setActiveFeedbackId(null);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
      toast.error("Action failed.");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const supabase = createClient();

      if (deleteTarget.type === "design") {
        const d = deleteTarget.item as CoverDesign;
        const ref = parseStorageRef(d.image_url);
        if (ref) await supabase.storage.from(ref.bucket).remove([ref.path]);

        const { error: dbErr } = await supabase.from("cover_designs").delete().eq("id", d.id);
        if (dbErr) throw dbErr;

        await supabase.from("activity_logs").insert({
          book_id: bookId,
          user_id: currentUserId,
          action: "cover_design_deleted",
          entity_type: "cover",
          metadata: { design_id: d.id, version: d.version_number },
        });
      } else {
        const r = deleteTarget.item as CoverRef;
        if (r.image_url && r.image_url.startsWith("http")) {
          // Public URL — storage cleanup is best-effort
        }
        const { error: dbErr } = await supabase.from("cover_references").delete().eq("id", r.id);
        if (dbErr) throw dbErr;

        await supabase.from("activity_logs").insert({
          book_id: bookId,
          user_id: currentUserId,
          action: "cover_reference_deleted",
          entity_type: "cover",
          metadata: { ref_id: r.id },
        });
      }

      toast.success("Deleted successfully.");
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
      toast.error("Delete failed.");
    } finally {
      setDeleting(false);
    }
  }

  // ─── Filtering ────────────────────────────────────────────────────────────
  const filteredDesigns = designs.filter((d) => {
    if (filter === "final") return d.is_final || d.status === "approved";
    if (filter === "pending") return d.status === "draft";
    if (filter === "author") return false; // designs are admin-uploaded
    return true;
  });

  const filteredRefs = refs.filter(() => {
    if (filter === "admin") return false; // refs are author-uploaded
    if (filter === "final") return false;
    if (filter === "pending") return true;
    return true;
  });

  const latestDesignId = designs[0]?.id;

  // Overall workflow status
  let statusLabel = "No Brief Submitted";
  let statusColor = "text-zinc-500 bg-zinc-500/10 border-zinc-500/20";
  if (designs.length > 0) {
    const latest = designs[0];
    if (latest.status === "approved") { statusLabel = "Approved ✓"; statusColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"; }
    else if (latest.status === "revision_requested") { statusLabel = "Revision Requested"; statusColor = "text-orange-400 bg-orange-500/10 border-orange-500/20"; }
    else { statusLabel = "Draft Under Review"; statusColor = "text-violet-400 bg-violet-500/10 border-violet-500/20"; }
  } else if (refs.length > 0) {
    statusLabel = "Pending Design Team";
    statusColor = "text-blue-400 bg-blue-500/10 border-blue-500/20";
  }

  const FILTER_OPTIONS: { key: FilterType; label: string }[] = [
    { key: "all", label: "All Content" },
    { key: "author", label: "Author Briefs" },
    { key: "admin", label: "Design Uploads" },
    { key: "final", label: "Final Covers" },
    { key: "pending", label: "Pending Review" },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl border border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl shimmer" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32 shimmer" />
              <Skeleton className="h-3 w-64 shimmer" />
            </div>
          </div>
          <Skeleton className="h-8 w-24 rounded-full shimmer" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <Skeleton className="h-20 w-full rounded-2xl shimmer" />
            <Skeleton className="h-48 w-full rounded-2xl shimmer" />
            <Skeleton className="h-[250px] w-full rounded-2xl shimmer" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full rounded-2xl shimmer" />
            <Skeleton className="h-28 w-full rounded-2xl shimmer" />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <Skeleton className="h-[350px] w-full rounded-2xl shimmer" />
              <Skeleton className="h-[350px] w-full rounded-2xl shimmer" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ErrorBanner message={error ?? ""} onDismiss={() => setError(null)} />

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl border border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-pink-500/20 border border-violet-500/20 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Cover Design Studio</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Author briefs on the left · Design team drafts on the right</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`rounded-2xl border px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider ${statusColor}`}>
            {statusLabel}
          </div>

          {/* Filter */}
          <div className="relative">
            <button
              onClick={() => setFilterOpen((p) => !p)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/8 transition"
            >
              <Filter className="h-3.5 w-3.5 text-violet-400" />
              {FILTER_OPTIONS.find((f) => f.key === filter)?.label ?? "All"}
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
                      onClick={() => { setFilter(opt.key); setFilterOpen(false); }}
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
      </div>

      {/* ── Workflow Progress Visual ── */}
      <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-950/40 backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Cover Design Stage</span>
          <span className="text-xs font-bold text-violet-400">
            {designs.some(d => d.is_final) ? "Completed ✓" : "In Progress"}
          </span>
        </div>
        
        <div className="grid grid-cols-4 gap-2 relative">
          {/* Progress track line */}
          <div className="absolute top-[18px] left-[12.5%] right-[12.5%] h-0.5 bg-zinc-800 -z-10" />
          
          {/* Step 1: Brief */}
          <div className="flex flex-col items-center text-center space-y-2">
            <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-xs font-bold transition duration-300 ${
              refs.length > 0 
                ? "bg-blue-500/10 border-blue-500 text-blue-400"
                : "bg-zinc-900 border-zinc-800 text-zinc-600"
            }`}>
              1
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${refs.length > 0 ? "text-white" : "text-zinc-500"}`}>Briefing</span>
          </div>

          {/* Step 2: Concepts */}
          <div className="flex flex-col items-center text-center space-y-2">
            <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-xs font-bold transition duration-300 ${
              designs.length > 0 
                ? "bg-violet-500/10 border-violet-500 text-violet-400"
                : "bg-zinc-900 border-zinc-800 text-zinc-600"
            }`}>
              2
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${designs.length > 0 ? "text-white" : "text-zinc-500"}`}>Concepts</span>
          </div>

          {/* Step 3: Review */}
          <div className="flex flex-col items-center text-center space-y-2">
            <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-xs font-bold transition duration-300 ${
              designs.length > 0 && designs.some(d => d.status === "revision_requested")
                ? "bg-orange-500/10 border-orange-500 text-orange-400"
                : designs.length > 0
                ? "bg-violet-500/10 border-violet-500 text-violet-400"
                : "bg-zinc-900 border-zinc-800 text-zinc-600"
            }`}>
              3
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${designs.length > 0 ? "text-white" : "text-zinc-500"}`}>Revision</span>
          </div>

          {/* Step 4: Final */}
          <div className="flex flex-col items-center text-center space-y-2">
            <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-xs font-bold transition duration-300 ${
              designs.some(d => d.is_final)
                ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                : "bg-zinc-900 border-zinc-800 text-zinc-600"
            }`}>
              4
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${designs.some(d => d.is_final) ? "text-white" : "text-zinc-500"}`}>Approved</span>
          </div>
        </div>
      </div>

      {/* ── Two-column layout ─────────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION A — AUTHOR COVER REQUESTS
            ═══════════════════════════════════════════════════════════════════ */}
        <div className="space-y-4">
          <SectionHeader
            icon={<User className="h-5 w-5" />}
            title="Author Cover Requests"
            subtitle="Briefs, reference images & change requests from the author"
            count={filteredRefs.length}
            accentColor="blue"
          />

          {/* Author submission form */}
          {!isAdmin && (
            <div className="rounded-2xl border border-blue-500/15 bg-blue-950/10 p-5 space-y-4">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-400">Submit Cover Brief</p>
              <form onSubmit={submitRequest} className="space-y-3">
                <textarea
                  value={briefText}
                  onChange={(e) => setBriefText(e.target.value)}
                  placeholder="Describe your vision — style, colors, mood, fonts, imagery ideas..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white placeholder-zinc-600 min-h-[120px] focus:outline-none focus:border-blue-500 resize-none"
                />

                {filePreview ? (
                  <div className="relative aspect-video rounded-xl bg-zinc-950 overflow-hidden border border-white/10 flex items-center justify-center">
                    <Image src={filePreview} alt="Reference preview" fill className="object-cover opacity-75" />
                    <button
                      type="button"
                      onClick={() => { setSelectedFile(null); setFilePreview(null); }}
                      className="absolute top-2 right-2 bg-black/70 hover:bg-black/90 rounded-full p-1.5 text-zinc-400 hover:text-white transition"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center py-8 rounded-xl border border-dashed border-white/15 bg-white/3 hover:bg-white/6 cursor-pointer transition text-zinc-500 hover:text-zinc-300">
                    <ImageIcon className="h-6 w-6 mb-2" />
                    <span className="text-xs font-medium">Attach reference image (optional)</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                  </label>
                )}

                <button
                  type="submit"
                  disabled={submittingRequest || (!briefText.trim() && !selectedFile)}
                  className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-500 disabled:opacity-50 transition flex items-center justify-center gap-2"
                >
                  {submittingRequest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send Cover Request
                </button>
              </form>
            </div>
          )}

          {/* Author refs list */}
          {filteredRefs.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No cover briefs submitted"
              description={
                isAdmin
                  ? "The author has not submitted any cover briefs or visual references yet."
                  : "Submit your design preferences, color schemes, and references using the form above."
              }
              color="blue"
            />
          ) : (
            <div className="space-y-4">
              {filteredRefs.map((r) => (
                <CoverRefCard
                  key={r.id}
                  coverRef={r}
                  imageUrl={imageUrls[r.id]}
                  isAdmin={isAdmin}
                  onDelete={() => setDeleteTarget({ type: "ref", item: r })}
                />
              ))}
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION B — DESIGN TEAM RESPONSES
            ═══════════════════════════════════════════════════════════════════ */}
        <div className="space-y-4">
          <SectionHeader
            icon={<Shield className="h-5 w-5" />}
            title="Design Team Responses"
            subtitle="Draft covers, final covers & feedback from HQ designers"
            count={filteredDesigns.length}
            accentColor="violet"
          />

          {/* Admin upload controls */}
          {isAdmin && (
            <div className="rounded-2xl border border-violet-500/15 bg-violet-950/10 p-5 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-violet-400">Upload Design</p>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-700 bg-white/3 py-3 text-xs font-semibold text-zinc-400 hover:bg-white/6 hover:text-zinc-200 cursor-pointer transition">
                  {uploadingDraft ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  Draft v{(designs[0]?.version_number ?? 0) + 1}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadDesign(e, false)} disabled={uploadingDraft} />
                </label>
                <label className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-xs font-bold text-white hover:bg-violet-500 cursor-pointer transition">
                  {uploadingDraft ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Publish Final
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadDesign(e, true)} disabled={uploadingDraft} />
                </label>
              </div>
            </div>
          )}

          {/* Designs list */}
          {filteredDesigns.length === 0 ? (
            <EmptyState
              icon={ImageIcon}
              title="No design drafts uploaded"
              description={
                isAdmin
                  ? "Upload the first cover draft concept or the finalized artwork for the author's approval."
                  : "Our design team is working on your cover. Once uploaded, draft concepts will appear here."
              }
              color="violet"
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {filteredDesigns.map((d) => (
                <CoverDesignCard
                  key={d.id}
                  design={d}
                  imageUrl={imageUrls[d.id]}
                  isAdmin={isAdmin}
                  isLatest={d.id === latestDesignId}
                  activeFeedbackId={activeFeedbackId}
                  feedbackText={feedbackText}
                  onFeedbackChange={(id, text) => setFeedbackText((prev) => ({ ...prev, [id]: text }))}
                  onFeedbackOpen={(id) => setActiveFeedbackId(id)}
                  onFeedbackCancel={() => setActiveFeedbackId(null)}
                  onApprove={(id) => handleAuthorAction(id, "approved")}
                  onRequestChanges={(id, feedback) => handleAuthorAction(id, "revision_requested", feedback)}
                  onComments={(id, version) => {
                    setCommentThreadId(id);
                    setCommentThreadTitle(`Cover Draft v${version} Discussion`);
                  }}
                  onDelete={(design) => setDeleteTarget({ type: "design", item: design })}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Delete Modal ─────────────────────────────────────────────────────── */}
      <DeleteModal
        open={!!deleteTarget}
        title={
          deleteTarget?.type === "design"
            ? `Are you sure you want to permanently delete Cover Design v${(deleteTarget.item as CoverDesign).version_number}?`
            : "Are you sure you want to permanently delete this cover brief and reference?"
        }
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
      />

      {/* ── Comments Drawer ─────────────────────────────────────────────────── */}
      <CommentsDrawer
        threadId={commentThreadId || ""}
        type="author_designer"
        bookId={bookId}
        currentUserId={currentUserId}
        title={commentThreadTitle}
        isOpen={!!commentThreadId}
        onClose={() => setCommentThreadId(null)}
      />
    </div>
  );
}
