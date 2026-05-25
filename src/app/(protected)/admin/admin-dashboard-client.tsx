"use client";

import { useEffect, useState, useCallback } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { GlassCard } from "@/components/ui/glass-card";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";
import { useRealtimeTable } from "@/hooks/use-realtime";
import { uploadPrivate, resolveFileUrlViaApi, storageRef, parseStorageRef } from "@/lib/storage";
import type { Profile } from "@/lib/types/database";
import {
  Upload,
  Download,
  FileText,
  X,
  Loader2,
  Eye,
  FileUp,
  FolderDown,
  FileCheck,
  Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function AdminDashboardClient({
  profile,
  stats,
}: {
  profile: Profile;
  stats: {
    authors: number;
    books: number;
  };
}) {
  const [showUpload, setShowUpload] = useState(false);
  const [showDownload, setShowDownload] = useState(false);

  // Modal active tabs
  const [activeUploadTab, setActiveUploadTab] = useState<"upload" | "history">("upload");
  const [activeDownloadTab, setActiveDownloadTab] = useState<"download" | "history">("download");
  const [historySubTab, setHistorySubTab] = useState<"author" | "admin">("author");

  // Upload fields state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docTitle, setDocTitle] = useState("");
  const [docCategory, setDocCategory] = useState("agreement");
  const [selectedAuthorId, setSelectedAuthorId] = useState("");
  const [selectedBookId, setSelectedBookId] = useState("");
  const [booksList, setBooksList] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (selectedAuthorId) {
      supabase
        .from("books")
        .select("id, title")
        .eq("author_id", selectedAuthorId)
        .order("title")
        .then(({ data }) => setBooksList(data ?? []));
    } else {
      setBooksList([]);
      setSelectedBookId("");
    }
  }, [selectedAuthorId, supabase]);

  // Dynamic author list for dropdown
  const [authorsList, setAuthorsList] = useState<Pick<Profile, "id" | "full_name" | "email">[]>([]);

  // Shared documents state (uploaded by authors)
  const [sharedDocs, setSharedDocs] = useState<any[]>([]);
  const [loadingShared, setLoadingShared] = useState(false);

  // Uploaded documents state (uploaded by admins)
  const [uploadedDocs, setUploadedDocs] = useState<any[]>([]);
  const [loadingUploaded, setLoadingUploaded] = useState(false);

  // File deletion state
  const [deletingFile, setDeletingFile] = useState<any | null>(null);
  const [confirmDeleteShow, setConfirmDeleteShow] = useState(false);

  // Document preview state
  const [previewDoc, setPreviewDoc] = useState<{ title: string; url: string; isImage: boolean; isPdf: boolean } | null>(null);
  const [resolvingPreviewId, setResolvingPreviewId] = useState<string | null>(null);

  const supabase = createClient();
  const toast = useToast();

  // Load Authors for dropdown
  const loadAuthors = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("role", "author")
      .order("full_name");
    setAuthorsList(data ?? []);
  }, [supabase]);

  useEffect(() => {
    loadAuthors();
  }, [loadAuthors]);

  // Load documents shared by authors
  const loadSharedDocs = useCallback(async () => {
    setLoadingShared(true);
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*, uploader:profiles!uploaded_by(full_name, role), author:profiles!author_id(full_name), book:books(title)")
        .neq("uploaded_by", profile.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSharedDocs((data ?? []).filter(d => (d.uploader as any)?.role === 'author'));
    } catch (err: any) {
      console.error("Failed to load author uploads:", err);
      toast.error("Failed to load uploaded files.");
    } finally {
      setLoadingShared(false);
    }
  }, [profile.id, supabase, toast]);

  // Load documents uploaded by admin
  const loadUploadedDocs = useCallback(async () => {
    setLoadingUploaded(true);
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*, uploader:profiles!uploaded_by(full_name), author:profiles!author_id(full_name), book:books(title)")
        .eq("uploaded_by", profile.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUploadedDocs(data ?? []);
    } catch (err: any) {
      console.error("Failed to load admin uploaded files:", err);
    } finally {
      setLoadingUploaded(false);
    }
  }, [profile.id, supabase]);

  // Trigger loading documents when modals open
  useEffect(() => {
    if (showUpload) {
      loadUploadedDocs();
      loadSharedDocs();
    }
    if (showDownload) {
      loadSharedDocs();
    }
  }, [showUpload, showDownload, loadUploadedDocs, loadSharedDocs]);

  // Setup real-time updates for documents
  useRealtimeTable("documents", null, () => {
    if (showUpload) {
      loadUploadedDocs();
      loadSharedDocs();
    }
    if (showDownload) {
      loadSharedDocs();
    }
  });

  // File Deletion Handler (Deletes the record from the database completely)
  const handleConfirmDelete = async () => {
    if (!deletingFile) return;
    try {
      const { error } = await supabase
        .from("documents")
        .delete()
        .eq("id", deletingFile.id);

      if (error) throw error;
      toast.success("File deleted from history.");
      setConfirmDeleteShow(false);
      setDeletingFile(null);
      
      // Reload details
      loadUploadedDocs();
      loadSharedDocs();
    } catch (err: any) {
      console.error("Delete file error:", err);
      toast.error("Failed to delete file from history.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!docTitle) {
        const titleWithoutExt = file.name.replace(/\.[^/.]+$/, "");
        setDocTitle(titleWithoutExt);
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !selectedAuthorId) {
      toast.error("Please select a file and assign an author.");
      return;
    }
    setUploading(true);

    try {
      const cleanFileName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `admin-uploads/${selectedAuthorId}/${Date.now()}-${cleanFileName}`;
      
      // Upload to private Supabase bucket
      const { path: storedPath } = await uploadPrivate("documents", path, selectedFile);
      const fileRef = storageRef("documents", storedPath);

      // Insert document record in DB
      const { error: insertErr } = await supabase.from("documents").insert({
        author_id: selectedAuthorId,
        book_id: selectedBookId || null,
        title: docTitle.trim() || selectedFile.name,
        file_url: fileRef,
        file_name: selectedFile.name,
        file_size: selectedFile.size,
        category: docCategory,
        uploaded_by: profile.id,
      });

      if (insertErr) throw insertErr;

      // Log activity
      await supabase.from("activity_logs").insert({
        user_id: profile.id,
        action: "document_uploaded",
        entity_type: "document",
        metadata: { title: docTitle.trim() || selectedFile.name, category: docCategory, assigned_author: selectedAuthorId, book_id: selectedBookId || null },
      });

      toast.success("File uploaded and synced to author dashboard!");
      setShowUpload(false);
      setSelectedFile(null);
      setDocTitle("");
      setSelectedAuthorId("");
      setSelectedBookId("");
      setDocCategory("agreement");
    } catch (err: any) {
      console.error("Upload process error:", err);
      toast.error(err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadFile = async (doc: any) => {
    try {
      const ref = parseStorageRef(doc.file_url);
      const url = ref
        ? await resolveFileUrlViaApi(ref.bucket, ref.path)
        : await resolveFileUrlViaApi("documents", doc.file_url);
      window.open(url, "_blank");
    } catch (err: any) {
      console.error("Download error:", err);
      toast.error(err.message || "Failed to download file.");
    }
  };

  const handlePreviewFile = async (doc: any) => {
    setResolvingPreviewId(doc.id);
    try {
      const ref = parseStorageRef(doc.file_url);
      const url = ref
        ? await resolveFileUrlViaApi(ref.bucket, ref.path)
        : await resolveFileUrlViaApi("documents", doc.file_url);

      const isImage = /\.(png|jpe?g|webp|svg)$/i.test(doc.file_name);
      const isPdf = /\.pdf$/i.test(doc.file_name);

      setPreviewDoc({
        title: doc.title,
        url,
        isImage,
        isPdf,
      });
    } catch (err: any) {
      console.error("Preview error:", err);
      toast.error(err.message || "Failed to generate file preview.");
    } finally {
      setResolvingPreviewId(null);
    }
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (!bytes || isNaN(bytes)) return "0 B";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  return (
    <DashboardShell title="Workspace">
      <div className="space-y-8 flex-grow flex flex-col justify-center">
        {/* Welcome Section */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white font-serif tracking-tight">
            Welcome Back, Admin 👋
          </h2>
          <p className="text-sm text-zinc-500">
            Publishing workspace is active.
          </p>
        </div>

        {/* Small Simple Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/5 bg-[#09090b]/80 p-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-8 h-8 bg-amber-500/5 rounded-full blur-[15px]" />
            <p className="text-2xl font-bold text-white font-mono">{stats.authors}</p>
            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mt-0.5">Total Authors</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-[#09090b]/80 p-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-8 h-8 bg-amber-500/5 rounded-full blur-[15px]" />
            <p className="text-2xl font-bold text-white font-mono">{stats.books}</p>
            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mt-0.5">Total Books</p>
          </div>
        </div>

        {/* Home Cards Grid */}
        <div className="grid gap-6">
          {/* Card A: Upload Files */}
          <GlassCard className="p-6! border-white/5 bg-[#09090b]/80 flex flex-col justify-between hover:border-amber-500/10 transition-all duration-300 relative overflow-hidden" hover={true}>
            <div className="space-y-4">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                <FileUp className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Upload Files</h3>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                  Send files to publishing team
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowUpload(true)}
              className="mt-6 w-full flex items-center justify-center gap-2 rounded-2xl bg-white hover:bg-zinc-200 py-3.5 text-xs font-bold text-black uppercase tracking-wider transition-all"
            >
              Upload File
            </button>
          </GlassCard>

          {/* Card B: Download Files */}
          <GlassCard className="p-6! border-white/5 bg-[#09090b]/80 flex flex-col justify-between hover:border-amber-500/10 transition-all duration-300 relative overflow-hidden" hover={true}>
            <div className="space-y-4">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                <FolderDown className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Download Files</h3>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                  Files shared by admin team
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowDownload(true)}
              className="mt-6 w-full flex items-center justify-center gap-2 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 py-3.5 text-xs font-bold text-white uppercase tracking-wider transition-all"
            >
              Download Files
            </button>
          </GlassCard>
        </div>
      </div>

      {/* ── UPLOAD MODAL ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showUpload && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#09090b] p-6 shadow-2xl relative"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                <div>
                  <h3 className="text-base font-bold text-white">Upload File</h3>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Send a file securely to an author's dashboard.</p>
                </div>
                <button
                  onClick={() => {
                    setShowUpload(false);
                    setSelectedFile(null);
                    setDocTitle("");
                    setSelectedAuthorId("");
                    setSelectedBookId("");
                    setDocCategory("agreement");
                    setActiveUploadTab("upload");
                  }}
                  className="rounded-full bg-white/5 p-1.5 text-zinc-400 hover:text-white transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Tab Navigation */}
              <div className="flex gap-2 mb-4 border-b border-white/5 pb-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveUploadTab("upload")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                    activeUploadTab === "upload"
                      ? "bg-white text-black shadow-md"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setActiveUploadTab("history")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                    activeUploadTab === "history"
                      ? "bg-white text-black shadow-md"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Past Uploaded Files
                </button>
              </div>

              {activeUploadTab === "upload" ? (
                <form onSubmit={handleUploadSubmit} className="space-y-4">
                  {/* File Drop Area */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Select File</label>
                    {selectedFile ? (
                      <div className="flex items-center justify-between p-3.5 rounded-2xl border border-white/10 bg-white/3 font-medium">
                        <div className="flex items-center gap-2 overflow-hidden mr-2">
                          <FileText className="h-5 w-5 text-amber-500 shrink-0" />
                          <div className="overflow-hidden">
                            <p className="text-xs text-white truncate font-semibold">{selectedFile.name}</p>
                            <p className="text-[9px] text-zinc-500 mt-0.5">{formatBytes(selectedFile.size)}</p>
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
                      <label className="flex flex-col items-center justify-center p-6 rounded-2xl border border-dashed border-white/15 bg-white/1 hover:bg-white/3 cursor-pointer transition text-zinc-500 hover:text-zinc-300">
                        <Upload className="h-5 w-5 mb-1.5 text-amber-500" />
                        <span className="text-xs font-semibold">Select PDF, Word, or image file</span>
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.webp"
                          required
                          onChange={handleFileChange}
                        />
                      </label>
                    )}
                  </div>

                  {/* Document Title */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Document Title</label>
                    <input
                      type="text"
                      required
                      placeholder="Enter document title"
                      className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-amber-500/30 transition-all font-semibold"
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                    />
                  </div>

                  {/* Target Author Dropdown */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Assign to Author</label>
                    <select
                      required
                      className="w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500/30 transition-all font-semibold"
                      value={selectedAuthorId}
                      onChange={(e) => setSelectedAuthorId(e.target.value)}
                    >
                      <option value="">Select Author...</option>
                      {authorsList.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.full_name} ({a.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Book Linkage Dropdown */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Associate with Book (Optional)</label>
                    <select
                      className="w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500/30 transition-all font-semibold"
                      value={selectedBookId}
                      onChange={(e) => setSelectedBookId(e.target.value)}
                      disabled={!selectedAuthorId}
                    >
                      <option value="">{selectedAuthorId ? "General Publication File" : "Select Author first..."}</option>
                      {booksList.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Category */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Category</label>
                    <select
                      className="w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500/30 transition-all font-semibold"
                      value={docCategory}
                      onChange={(e) => setDocCategory(e.target.value)}
                    >
                      <option value="agreement">Agreement / Contract</option>
                      <option value="isbn_certificate">ISBN Document</option>
                      <option value="invoice">Invoice / Bill</option>
                      <option value="royalty_statement">Royalty Statement</option>
                      <option value="contract">Contract</option>
                      <option value="other">Other Document</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={uploading || !selectedFile || !selectedAuthorId}
                    className="w-full rounded-2xl bg-white hover:bg-zinc-200 py-3.5 text-xs font-bold text-black uppercase tracking-wider transition disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Uploading to Author…
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" /> Upload Document
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <div className="flex flex-col max-h-[50vh]">
                  {/* Sub-tabs for Author vs Admin Uploaded Files */}
                  <div className="flex gap-2 mb-3 bg-white/5 p-1 rounded-xl shrink-0">
                    <button
                      type="button"
                      onClick={() => setHistorySubTab("author")}
                      className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition ${
                        historySubTab === "author" ? "bg-zinc-800 text-amber-500" : "text-zinc-450 hover:text-white"
                      }`}
                    >
                      Author Uploaded Files
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistorySubTab("admin")}
                      className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition ${
                        historySubTab === "admin" ? "bg-zinc-800 text-amber-500" : "text-zinc-450 hover:text-white"
                      }`}
                    >
                      Admin Uploaded Files
                    </button>
                  </div>

                  {/* List Container */}
                  <div className="flex-grow overflow-y-auto space-y-3 py-1 pr-1">
                    {(() => {
                      const files = historySubTab === "author" ? sharedDocs : uploadedDocs;
                      const loadingFiles = historySubTab === "author" ? loadingShared : loadingUploaded;
                      
                      if (loadingFiles) {
                        return (
                          <div className="flex flex-col items-center justify-center py-10 text-zinc-550 gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                            <span className="text-[10px]">Loading history...</span>
                          </div>
                        );
                      }
                      
                      if (files.length === 0) {
                        return (
                          <p className="text-xs text-zinc-500 italic text-center py-10">No past uploaded files in this history.</p>
                        );
                      }

                      return files.map((doc) => (
                        <div key={doc.id} className="p-3.5 rounded-2xl border border-white/5 bg-white/2 hover:border-amber-500/10 transition-all flex flex-col justify-between gap-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-bold text-white text-xs truncate">{doc.title}</p>
                              <p className="text-[9px] text-zinc-500 truncate mt-0.5 font-mono">{doc.file_name}</p>
                            </div>
                            <span className="text-[8px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border border-amber-500/20 bg-amber-500/5 text-amber-500 shrink-0 capitalize">
                              {doc.category.replace(/_/g, " ")}
                            </span>
                          </div>

                          <div className="text-[10px] text-zinc-400 space-y-0.5">
                            {doc.book?.title && (
                              <p>
                                Book: <span className="text-zinc-300 font-semibold">{doc.book.title}</span>
                              </p>
                            )}
                            <p>
                              Author: <span className="text-amber-500 font-semibold">{doc.author?.full_name ?? "Assigned Author"}</span>
                            </p>
                          </div>

                          <div className="flex justify-between items-center text-[9px] text-zinc-500 border-t border-white/5 pt-2 mt-1">
                            <div>
                              <p>Time: {new Date(doc.created_at).toLocaleString()}</p>
                              <p className="mt-0.5">By: {doc.uploaded_by === profile.id ? "You" : "Author"}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[8px] font-mono border border-white/10 bg-white/5 px-1.5 py-0.5 rounded text-zinc-400">
                                {doc.status || "Uploaded"}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setDeletingFile(doc);
                                  setConfirmDeleteShow(true);
                                }}
                                className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/20 transition shrink-0"
                                title="Remove from History"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── DOWNLOAD MODAL ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showDownload && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#09090b] p-6 shadow-2xl relative flex flex-col max-h-[85vh]"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4 shrink-0">
                <div>
                  <h3 className="text-base font-bold text-white">Download Vault</h3>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Documents uploaded by authors.</p>
                </div>
                <button
                  onClick={() => {
                    setShowDownload(false);
                    setActiveDownloadTab("download");
                  }}
                  className="rounded-full bg-white/5 p-1.5 text-zinc-400 hover:text-white transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Tab Navigation */}
              <div className="flex gap-2 mb-4 border-b border-white/5 pb-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveDownloadTab("download")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                    activeDownloadTab === "download"
                      ? "bg-white text-black shadow-md"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Available Files
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDownloadTab("history")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                    activeDownloadTab === "history"
                      ? "bg-white text-black shadow-md"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Past Downloaded Files
                </button>
              </div>

              {/* Shared Document list */}
              <div className="flex-grow overflow-y-auto space-y-3 pr-1 py-1">
                {loadingShared ? (
                  <div className="flex flex-col items-center justify-center py-12 text-zinc-500 gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
                    <span className="text-xs">Fetching vault...</span>
                  </div>
                ) : sharedDocs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-zinc-500 text-center space-y-2">
                    <FileCheck className="h-8 w-8 text-zinc-700" />
                    <p className="text-xs font-semibold">No uploaded files found</p>
                    <p className="text-[10px] text-zinc-600 max-w-[240px]">
                      Documents uploaded by authors will automatically appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeDownloadTab === "history" && (
                      <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-2 border-b border-white/5 pb-1">
                        FILES FROM AUTHOR
                      </div>
                    )}
                    {sharedDocs.map((doc) => {
                      const previewable = /\.(pdf|png|jpe?g|webp|svg)$/i.test(doc.file_name);
                      
                      return (
                        <div
                          key={doc.id}
                          className="p-4 rounded-2xl border border-white/5 bg-white/2 hover:border-amber-500/10 transition-all flex flex-col justify-between space-y-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-bold text-white text-sm truncate">{doc.title}</p>
                              <p className="text-[10px] text-zinc-400 truncate mt-0.5">
                                By: <span className="text-amber-500 font-semibold">{doc.uploader?.full_name ?? "Author"}</span>
                              </p>
                              {doc.book?.title && (
                                <p className="text-[10px] text-zinc-450 mt-0.5">
                                  Book: <span className="text-zinc-350 font-semibold">{doc.book.title}</span>
                                </p>
                              )}
                              <p className="text-[9px] text-zinc-650 truncate mt-0.5 font-mono">{doc.file_name}</p>
                            </div>
                            <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border border-amber-500/20 bg-amber-500/5 text-amber-500 shrink-0 capitalize">
                              {doc.category.replace(/_/g, " ")}
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-[10px] text-zinc-500 border-t border-white/5 pt-2">
                            <span>Size: {formatBytes(doc.file_size)}</span>
                            <span>Shared: {new Date(doc.created_at).toLocaleDateString()}</span>
                          </div>

                          <div className="flex gap-2">
                            {previewable && (
                              <button
                                onClick={() => handlePreviewFile(doc)}
                                disabled={resolvingPreviewId === doc.id}
                                className="flex-grow flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/10 transition disabled:opacity-50"
                              >
                                {resolvingPreviewId === doc.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Eye className="h-3.5 w-3.5" />
                                )}
                                Preview
                              </button>
                            )}
                            <button
                              onClick={() => handleDownloadFile(doc)}
                              className="flex-grow flex items-center justify-center gap-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 py-2 text-xs font-bold text-amber-500 hover:bg-amber-500/20 transition"
                            >
                              <Download className="h-3.5 w-3.5" />
                              Download
                            </button>
                            {activeDownloadTab === "history" && (
                              <button
                                type="button"
                                onClick={() => {
                                  setDeletingFile(doc);
                                  setConfirmDeleteShow(true);
                                }}
                                className="p-2 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/20 transition shrink-0"
                                title="Remove from History"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── PREVIEW SUB-MODAL ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {previewDoc && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-[#050508] p-5 shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-3 shrink-0">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white truncate">{previewDoc.title}</h3>
                  <p className="text-[9px] text-zinc-500 mt-0.5">Secure Document Preview</p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={previewDoc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold text-zinc-300 hover:bg-white/10 transition"
                  >
                    Full Window
                  </a>
                  <button
                    onClick={() => setPreviewDoc(null)}
                    className="rounded-full bg-white/5 p-1 text-zinc-400 hover:text-white transition"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Viewport content */}
              <div className="flex-grow overflow-auto bg-zinc-900/40 rounded-2xl border border-white/5 flex items-center justify-center p-3 max-h-[70vh]">
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
                    className="w-full h-[60vh] rounded-lg border-0 bg-white"
                  />
                ) : (
                  <div className="text-center py-10 text-zinc-500">
                    <p className="font-semibold text-xs text-white">No direct preview available</p>
                    <p className="text-[10px] text-zinc-600 mt-1">Please download this document to review its content.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── FILE DELETE CONFIRMATION MODAL ────────────────────────────────────── */}
      <AnimatePresence>
        {confirmDeleteShow && deletingFile && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl border border-red-500/20 bg-zinc-950 p-6 shadow-2xl relative"
            >
              <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-red-500/20 to-transparent" />
              <h3 className="text-base font-bold text-red-400 mb-2">Remove File from History</h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-6">
                Are you sure you want to remove <span className="text-white font-semibold">"{deletingFile.title}"</span> from history?
                This will only remove the record from your dashboard visibility. The actual file is safe and will not be destroyed.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setConfirmDeleteShow(false);
                    setDeletingFile(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 rounded-xl bg-red-650 hover:bg-red-500 text-xs font-bold text-white transition"
                >
                  Yes, Remove
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardShell>
  );
}
