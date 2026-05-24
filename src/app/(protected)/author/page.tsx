"use client";

import { useEffect, useState, useCallback } from "react";
import { AuthorShell } from "@/components/layout/author-shell";
import { GlassCard } from "@/components/ui/glass-card";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";
import { sendNotification } from "@/lib/notifications";
import { uploadPrivate, resolveFileUrl, storageRef, parseStorageRef } from "@/lib/storage";
import type { Profile, Book } from "@/lib/types/database";
import { Upload, Download, FileText, X, Loader2, Eye, FileUp, Sparkles, FolderDown, FileCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AuthorDashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [showUpload, setShowUpload] = useState(false);
  const [showDownload, setShowDownload] = useState(false);

  // Upload fields state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docTitle, setDocTitle] = useState("");
  const [docCategory, setDocCategory] = useState("other");
  const [selectedBookId, setSelectedBookId] = useState("");
  const [uploading, setUploading] = useState(false);

  // Shared documents state
  const [sharedDocs, setSharedDocs] = useState<any[]>([]);
  const [loadingShared, setLoadingShared] = useState(false);

  // Document preview state
  const [previewDoc, setPreviewDoc] = useState<{ title: string; url: string; isImage: boolean; isPdf: boolean } | null>(null);
  const [resolvingPreviewId, setResolvingPreviewId] = useState<string | null>(null);

  const supabase = createClient();
  const toast = useToast();

  const loadDashboard = useCallback(async () => {
    setError(null);
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      setError(authErr?.message ?? "Not signed in");
      setLoading(false);
      return;
    }

    // Load Profile
    const { data: p, error: pErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (pErr || !p) {
      setError(pErr?.message ?? "Profile not found");
      setLoading(false);
      return;
    }

    setProfile(p as Profile);

    // Load Books assigned to this author
    const { data: b } = await supabase
      .from("books")
      .select("*")
      .eq("author_id", user.id)
      .order("updated_at", { ascending: false });

    setBooks((b as Book[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Load documents shared by admin
  const loadSharedDocs = useCallback(async () => {
    if (!profile) return;
    setLoadingShared(true);
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*, uploader:profiles!uploaded_by(full_name)")
        .eq("author_id", profile.id)
        .neq("uploaded_by", profile.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSharedDocs(data ?? []);
    } catch (err: any) {
      console.error("Failed to load shared files:", err);
      toast.error("Failed to load files shared by admin.");
    } finally {
      setLoadingShared(false);
    }
  }, [profile, supabase, toast]);

  // Trigger loading shared documents when modal opens
  useEffect(() => {
    if (showDownload && profile) {
      loadSharedDocs();
    }
  }, [showDownload, profile, loadSharedDocs]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!docTitle) {
        // Remove extension for title suggestion
        const titleWithoutExt = file.name.replace(/\.[^/.]+$/, "");
        setDocTitle(titleWithoutExt);
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !profile) return;
    setUploading(true);

    try {
      const cleanFileName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `author-uploads/${profile.id}/${Date.now()}-${cleanFileName}`;
      
      // Upload to private Supabase bucket
      const { path: storedPath } = await uploadPrivate("documents", path, selectedFile);
      const fileRef = storageRef("documents", storedPath);

      // Insert document record in DB
      const { error: insertErr } = await supabase.from("documents").insert({
        book_id: selectedBookId || null,
        author_id: profile.id,
        title: docTitle.trim() || selectedFile.name,
        file_url: fileRef,
        file_name: selectedFile.name,
        file_size: selectedFile.size,
        category: docCategory,
        uploaded_by: profile.id,
      });

      if (insertErr) throw insertErr;

      // Log activity log
      await supabase.from("activity_logs").insert({
        book_id: selectedBookId || null,
        user_id: profile.id,
        action: "document_uploaded",
        entity_type: "document",
        metadata: { title: docTitle.trim() || selectedFile.name, category: docCategory },
      });

      // Send push notification + email to Admin/Staff
      const { data: admins } = await supabase
        .from("profiles")
        .select("id")
        .or("role.eq.super_admin,role.eq.staff");

      if (admins && admins.length > 0) {
        await sendNotification({
          userIds: admins.map((a) => a.id),
          type: "document_uploaded",
          title: "New File from Author",
          body: `Author ${profile.full_name} uploaded: "${docTitle.trim() || selectedFile.name}"`,
          link: "/admin/documents",
        });
      }

      toast.success("File uploaded to publishing team!");
      setShowUpload(false);
      setSelectedFile(null);
      setDocTitle("");
      setSelectedBookId("");
      setDocCategory("other");
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
        ? await resolveFileUrl(ref.path, ref.bucket)
        : await resolveFileUrl(doc.file_url, "documents");
      window.open(url, "_blank");
    } catch {
      toast.error("Failed to download file.");
    }
  };

  const handlePreviewFile = async (doc: any) => {
    setResolvingPreviewId(doc.id);
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
      toast.error("Failed to generate file preview.");
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030303] text-zinc-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-[#030303] text-zinc-100 flex flex-col items-center justify-center p-6 text-center">
        <p className="text-red-400 font-bold">Error loading dashboard</p>
        <p className="text-zinc-500 text-sm mt-1">{error || "Could not retrieve profile information."}</p>
        <button onClick={loadDashboard} className="mt-4 px-5 py-2.5 bg-white text-black font-bold text-xs rounded-xl uppercase">Retry</button>
      </div>
    );
  }

  return (
    <AuthorShell title="Workspace">
      <div className="space-y-8 flex-grow flex flex-col justify-center">
        {/* Welcome Section */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white font-serif tracking-tight">
            Welcome Back, {profile.full_name.split(" ")[0]} 👋
          </h2>
          <p className="text-sm text-zinc-500">
            Your publishing workspace is ready.
          </p>
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
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-5">
                <div>
                  <h3 className="text-base font-bold text-white">Upload Document</h3>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Send a file securely to the Sadbhawana editors.</p>
                </div>
                <button
                  onClick={() => {
                    setShowUpload(false);
                    setSelectedFile(null);
                    setDocTitle("");
                    setSelectedBookId("");
                    setDocCategory("other");
                  }}
                  className="rounded-full bg-white/5 p-1.5 text-zinc-400 hover:text-white transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

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

                {/* Book Linkage */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Associate with Book (Optional)</label>
                  <select
                    className="w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500/30 transition-all font-semibold"
                    value={selectedBookId}
                    onChange={(e) => setSelectedBookId(e.target.value)}
                  >
                    <option value="">General Publication File</option>
                    {books.map((b) => (
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
                    <option value="other">Manuscript Draft</option>
                    <option value="agreement">Agreement / Contract</option>
                    <option value="other">Book Cover Concept</option>
                    <option value="royalty_statement">Royalty Statement</option>
                    <option value="invoice">Invoice / Bill</option>
                    <option value="isbn_certificate">ISBN Document</option>
                    <option value="contract">Contract</option>
                    <option value="other">Other Document</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={uploading || !selectedFile}
                  className="w-full rounded-2xl bg-white hover:bg-zinc-200 py-3.5 text-xs font-bold text-black uppercase tracking-wider transition disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Uploading to HQ…
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" /> Upload Document
                    </>
                  )}
                </button>
              </form>
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
                  <h3 className="text-base font-bold text-white">Files Shared by HQ</h3>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Documents uploaded by the publishing team.</p>
                </div>
                <button
                  onClick={() => setShowDownload(false)}
                  className="rounded-full bg-white/5 p-1.5 text-zinc-400 hover:text-white transition"
                >
                  <X className="h-4 w-4" />
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
                    <p className="text-xs font-semibold">No shared files found</p>
                    <p className="text-[10px] text-zinc-600 max-w-[240px]">
                      Documents shared by headquarters will automatically appear here.
                    </p>
                  </div>
                ) : (
                  sharedDocs.map((doc) => {
                    const previewable = /\.(pdf|png|jpe?g|webp|svg)$/i.test(doc.file_name);
                    
                    return (
                      <div
                        key={doc.id}
                        className="p-4 rounded-2xl border border-white/5 bg-white/2 hover:border-amber-500/10 transition-all flex flex-col justify-between space-y-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-bold text-white text-sm truncate">{doc.title}</p>
                            <p className="text-[10px] text-zinc-500 truncate mt-0.5 font-mono">{doc.file_name}</p>
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
                              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/10 transition disabled:opacity-50"
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
                            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 py-2 text-xs font-bold text-amber-500 hover:bg-amber-500/20 transition"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Download
                          </button>
                        </div>
                      </div>
                    );
                  })
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
    </AuthorShell>
  );
}
