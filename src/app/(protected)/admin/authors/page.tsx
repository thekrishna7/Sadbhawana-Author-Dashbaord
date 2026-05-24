"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { GlassCard } from "@/components/ui/glass-card";
import { CreateUserModal } from "@/components/admin/create-user-modal";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";
import { Plus, Search, X, Trash2, Loader2, User, Phone, Mail, Edit2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminAuthorsPage() {
  const supabase = createClient();
  const toast = useToast();
  const [profile, setProfile] = useState<any | null>(null);
  const [authors, setAuthors] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [deletingAuthor, setDeletingAuthor] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*, books(*)")
      .eq("role", "author")
      .order("created_at", { ascending: false });
    setAuthors(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user)
        supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .single()
          .then(({ data }) => setProfile(data));
    });
    load();
  }, [supabase, load]);

  // Sync realtime
  useEffect(() => {
    const channel = supabase
      .channel("admin-authors-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return authors;
    return authors.filter(
      (a) =>
        a.full_name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        (a.phone ?? "").toLowerCase().includes(q)
    );
  }, [authors, search]);

  const handleDeleteUser = async () => {
    if (!deletingAuthor) return;
    setIsDeleting(true);
    try {
      const res = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: deletingAuthor.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete author");

      toast.success(`Author "${deletingAuthor.full_name}" deleted.`);
      setDeletingAuthor(null);
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete author.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!profile) return null;

  return (
    <DashboardShell
      title="Authors"
      actions={
        <button
          onClick={() => setModal(true)}
          className="flex items-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-600 px-4 py-2.5 text-xs font-bold text-black transition"
        >
          <Plus className="h-4 w-4" /> Add Author
        </button>
      }
    >
      <div className="space-y-6 flex-grow flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center shrink-0">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white font-serif">Authors Directory</h2>
            <p className="text-xs text-zinc-500">Manage author rosters and workspace login access.</p>
          </div>
          <button
            onClick={() => setModal(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-amber-500 hover:text-amber-400 transition"
          >
            <Plus className="h-4 w-4" /> Add Author
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by author name, email, or phone..."
            className="w-full rounded-2xl border border-white/10 bg-white/5 py-3.5 pl-11 pr-4 text-sm text-white placeholder-zinc-650 focus:outline-none focus:border-amber-500/30 transition-all font-semibold"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-500 border border-dashed border-white/10 rounded-3xl">
            <User className="h-10 w-10 text-zinc-700 mb-2" />
            <p className="text-sm font-semibold">No authors found</p>
            <p className="text-xs text-zinc-600 mt-1">Add a new author user to get started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((author) => (
              <div
                key={author.id}
                className="p-5 rounded-2xl border border-white/5 bg-[#09090b]/80 flex items-center justify-between hover:border-amber-500/10 transition-all duration-300 group"
              >
                <div className="min-w-0 flex-1 mr-4 space-y-1.5">
                  <div className="flex items-center gap-3">
                    {author.avatar_url ? (
                      <div className="h-10 w-10 rounded-full overflow-hidden relative shrink-0">
                        <img src={author.avatar_url} alt="" className="object-cover h-10 w-10" />
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-sm font-bold text-amber-500 shrink-0">
                        {author.full_name?.charAt(0) || "A"}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="font-bold text-white text-base truncate font-serif leading-snug group-hover:text-amber-400 transition-colors">
                        {author.full_name}
                      </h3>
                      <p className="text-xs text-zinc-500 font-medium">Author Account</p>
                    </div>
                  </div>

                  <div className="space-y-1 pl-13">
                    <p className="text-xs text-zinc-400 flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-zinc-500" /> {author.email}
                    </p>
                    {author.phone && (
                      <p className="text-xs text-zinc-400 flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-zinc-500" /> {author.phone}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/admin/authors/${author.id}`}
                    className="p-2 rounded-xl border border-white/5 bg-white/2 text-zinc-400 hover:text-white hover:border-amber-500/20 transition-all"
                    title="Edit Author"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => setDeletingAuthor(author)}
                    className="p-2 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/20 transition"
                    title="Delete Author"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateUserModal open={modal} onClose={() => setModal(false)} onCreated={load} />

      {/* ── DELETE CONFIRMATION MODAL ─────────────────────────────────────── */}
      <AnimatePresence>
        {deletingAuthor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl border border-red-500/20 bg-[#09090b] p-6 shadow-2xl relative"
            >
              <h3 className="text-base font-bold text-red-400 mb-2">Delete Author User</h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-6">
                Are you sure you want to delete <span className="text-white font-semibold">"{deletingAuthor.full_name}"</span>?
                This will delete the user account, profile, all assigned books, transactions, and messages. This is irreversible.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeletingAuthor(null)}
                  className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteUser}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isDeleting && <Loader2 className="h-3 w-3 animate-spin" />}
                  Delete Account
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardShell>
  );
}
