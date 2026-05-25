"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { GlassCard } from "@/components/ui/glass-card";
import { CreateUserModal } from "@/components/admin/create-user-modal";
import { createClient } from "@/lib/supabase/client";
import { ADMIN_NAV } from "@/lib/constants";
import { getInitials } from "@/lib/utils";
import { useRealtimeTable } from "@/hooks/use-realtime";
import type { Profile } from "@/lib/types/database";
import { Plus, Search, X, Trash2, Loader2, Users, Mail, Phone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

export default function AdminAuthorsPage() {
  const supabase = createClient();
  const toast = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authors, setAuthors] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [deletingUserItem, setDeletingUserItem] = useState<Profile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loading, setLoading] = useState(true);

  async function handleDeleteUser() {
    if (!deletingUserItem) return;
    setIsDeleting(true);
    try {
      const res = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: deletingUserItem.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete author");

      toast.success(`Author "${deletingUserItem.full_name}" deleted successfully.`);
      setDeletingUserItem(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete author.");
    } finally {
      setIsDeleting(false);
    }
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user)
        supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .single()
          .then(({ data }) => setProfile(data as Profile));
    });
  }, [supabase]);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "author")
      .order("created_at", { ascending: false });
    setAuthors((data as Profile[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeTable("profiles", null, load);

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

  if (!profile) return null;

  return (
    <DashboardShell
      nav={ADMIN_NAV}
      profile={profile}
      brand="Author Dashboard"
      title="Authors"
      subtitle="Manage publication creator access and database profiles"
      actions={
        <button
          onClick={() => setModal(true)}
          className="flex items-center gap-2 rounded-2xl bg-white hover:bg-zinc-200 px-5 py-2.5 text-xs font-bold text-black uppercase tracking-wider transition"
        >
          <Plus className="h-4 w-4" /> Add Author
        </button>
      }
    >
      {/* Search and stats bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or mobile..."
            className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/30 focus:ring-1 focus:ring-amber-500/10 transition-all font-semibold"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">
          {filtered.length} of {authors.length} authors
        </span>
      </div>

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-white/5 bg-zinc-900/40 p-6 space-y-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-14 w-14 rounded-full shimmer" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-2/3 rounded shimmer" />
                  <Skeleton className="h-3.5 w-1/2 rounded shimmer" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="col-span-full">
          <EmptyState
            icon={Users}
            title={search ? "No authors found" : "No authors registered"}
            description={
              search
                ? `We couldn't find any authors matching "${search}".`
                : "No author profiles have been created yet. Get started by registering your first author."
            }
            color="amber"
            action={
              !search ? (
                <button
                  onClick={() => setModal(true)}
                  className="rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-black hover:bg-zinc-200 transition shadow-lg"
                >
                  Add Author
                </button>
              ) : (
                <button
                  onClick={() => setSearch("")}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-zinc-300 hover:bg-white/10 transition"
                >
                  Clear Search
                </button>
              )
            }
          />
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((author) => (
            <GlassCard key={author.id} className="p-6! border-white/5 bg-[#09090b]/80 relative group" hover={true}>
              {/* Deletion button top-right */}
              <button
                onClick={() => setDeletingUserItem(author)}
                className="absolute top-4 right-4 p-2 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition z-10 opacity-0 group-hover:opacity-100 focus:opacity-100"
                title="Delete Author"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>

              <div className="flex items-start gap-4">
                {/* Initials Avatar */}
                <div className="h-14 w-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-lg font-bold text-amber-500 shrink-0 font-serif">
                  {getInitials(author.full_name)}
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <h3 className="text-sm font-bold text-white truncate font-serif leading-none pt-1">
                    {author.full_name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-zinc-500">
                    <Mail className="h-3 w-3 shrink-0" />
                    <p className="text-[10px] truncate font-medium font-mono">{author.email}</p>
                  </div>
                  {author.phone && (
                    <div className="flex items-center gap-1.5 text-zinc-500">
                      <Phone className="h-3 w-3 shrink-0" />
                      <p className="text-[10px] truncate font-medium font-mono">{author.phone}</p>
                    </div>
                  )}
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Register Author Modal */}
      <CreateUserModal open={modal} onClose={() => setModal(false)} onCreated={load} />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingUserItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl border border-red-500/20 bg-zinc-950 p-6 shadow-2xl relative"
            >
              <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-red-500/20 to-transparent" />
              <div className="flex items-center gap-2 text-red-400 mb-2">
                <Trash2 className="h-4 w-4" />
                <h3 className="text-base font-bold">Delete Author</h3>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                Are you sure you want to permanently delete the author <span className="text-white font-semibold">"{deletingUserItem.full_name}"</span>?
                This clears their user profile, all associated books, royalties transactions, and messages.
              </p>
              <div className="rounded-xl border border-red-500/20 bg-red-950/20 px-3 py-2.5 mb-6">
                <p className="text-[10px] text-red-300 font-medium leading-normal">
                  <strong>Warning:</strong> This action is completely irreversible.
                </p>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeletingUserItem(null)}
                  className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  disabled={isDeleting}
                  onClick={handleDeleteUser}
                  className="px-4 py-2 rounded-xl bg-red-650 hover:bg-red-500 text-xs font-bold text-white transition flex items-center gap-1.5"
                >
                  {isDeleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
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
