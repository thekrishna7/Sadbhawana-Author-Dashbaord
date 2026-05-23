"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { GlassCard } from "@/components/ui/glass-card";
import { CreateUserModal } from "@/components/admin/create-user-modal";
import { createClient } from "@/lib/supabase/client";
import { ADMIN_NAV, PUBLISHING_STAGES } from "@/lib/constants";
import { getInitials } from "@/lib/utils";
import { useRealtimeTable } from "@/hooks/use-realtime";
import type { Profile, Book } from "@/lib/types/database";
import { Plus, Search, X, Trash2, Loader2, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

export default function AdminAuthorsPage() {
  const supabase = createClient();
  const toast = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authors, setAuthors] = useState<
    (Profile & { books?: Book[]; royalties?: { available_balance: number } })[]
  >([]);
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
      .select("*, books(*), author_royalties(available_balance)")
      .eq("role", "author")
      .order("created_at", { ascending: false });
    setAuthors((data as typeof authors) ?? []);
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
      subtitle="Creator roster & publishing status"
      actions={
        <button
          onClick={() => setModal(true)}
          className="flex items-center gap-2 rounded-2xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-500"
        >
          <Plus className="h-4 w-4" /> New author
        </button>
      }
    >
      {/* Premium search bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone..."
            className="w-full rounded-2xl border border-white/10 bg-white/5 py-3.5 pl-11 pr-4 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 focus:shadow-lg focus:shadow-violet-900/20 transition-all"
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
        <span className="text-xs text-zinc-600 whitespace-nowrap">
          {filtered.length} of {authors.length} authors
        </span>
      </div>

      {loading ? (
        <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-white/8 bg-zinc-900/60 h-[280px] relative">
              <Skeleton className="h-28 w-full shimmer" />
              <div className="p-8 -mt-12 relative space-y-4">
                <Skeleton className="h-20 w-20 rounded-2xl border-4 border-[#0c0c12] shimmer" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-2/3 rounded shimmer" />
                  <Skeleton className="h-4.5 w-1/2 rounded shimmer" />
                </div>
                <Skeleton className="h-4 w-1/3 rounded shimmer" />
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
                ? `We couldn't find any authors matching "${search}". Try adjusting your query.`
                : "No author profiles have been set up yet. Invite or create the first author account."
            }
            color="violet"
            action={
              !search ? (
                <button
                  onClick={() => setModal(true)}
                  className="rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-violet-500 transition shadow-lg shadow-violet-500/15"
                >
                  New Author
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
        <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((author) => {
            const activeBook = author.books?.[0];
            const stage = activeBook
              ? PUBLISHING_STAGES.find((s) => s.key === activeBook.current_stage)?.label
              : "No active book";
            return (
              <Link key={author.id} href={`/admin/authors/${author.id}`}>
                <GlassCard className="overflow-hidden p-0! h-full relative group animate-fade-in">
                  <div className="relative h-28 bg-gradient-to-br from-violet-900/30 to-zinc-900">
                    {author.banner_url && (
                      <Image src={author.banner_url} alt="" fill className="object-cover opacity-60" />
                    )}
                    {/* Delete button positioned top-right */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDeletingUserItem(author);
                      }}
                      className="absolute top-3 right-3 p-1.5 rounded-lg border border-red-500/20 bg-red-500/20 text-red-400 hover:bg-red-500/40 hover:text-red-300 transition z-20"
                      title="Delete Author"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="p-8 -mt-12 relative">
                    <div className="h-20 w-20 rounded-2xl overflow-hidden border-4 border-[#0c0c12] bg-violet-500/20 flex items-center justify-center text-xl font-bold text-violet-300">
                      {author.avatar_url ? (
                        <Image src={author.avatar_url} alt="" width={80} height={80} className="object-cover" />
                      ) : (
                        getInitials(author.full_name)
                      )}
                    </div>
                    <h3 className="text-xl font-semibold text-white mt-4">{author.full_name}</h3>
                    <p className="text-sm text-zinc-500">{author.books?.length ?? 0} books Â· {stage}</p>
                    <p className="text-sm text-emerald-400/80 mt-2">
                      â‚¹{Number((author as { author_royalties?: { available_balance: number }[] }).author_royalties?.[0]?.available_balance ?? 0).toLocaleString("en-IN")} available
                    </p>
                  </div>
                </GlassCard>
              </Link>
            );
          })}
        </div>
      )}

      <CreateUserModal open={modal} onClose={() => setModal(false)} onCreated={load} />

      {/* â”€â”€ Delete Author Confirmation Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <AnimatePresence>
        {deletingUserItem && (
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
                  onClick={() => setDeletingUserItem(null)}
                  className="rounded-full bg-white/5 p-1.5 text-zinc-400 hover:text-white transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-sm text-zinc-300">
                  Are you sure you want to permanently delete the author account for{" "}
                  <span className="text-white font-semibold">"{deletingUserItem.full_name}"</span>?
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
                  onClick={() => setDeletingUserItem(null)}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDeleteUser}
                  className="rounded-xl bg-red-600 px-5 py-2 text-xs font-bold text-white hover:bg-red-500 disabled:opacity-50 transition flex items-center gap-2 shadow-lg shadow-red-950/30"
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

