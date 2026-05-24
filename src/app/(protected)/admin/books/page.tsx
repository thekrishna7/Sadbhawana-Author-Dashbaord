"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { createClient } from "@/lib/supabase/client";
import { ADMIN_NAV } from "@/lib/constants";
import type { Profile, Book, BookType } from "@/lib/types/database";
import {
  Plus, X, Loader2, Search, BookOpen, Hash, ArrowRight, Trash2, Tag, Calendar, User, ShoppingBag, BookX
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { useRealtimeTable } from "@/hooks/use-realtime";

type BookWithAuthor = Book & { author?: Profile };

export default function AdminBooksPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [books, setBooks] = useState<BookWithAuthor[]>([]);
  const [authors, setAuthors] = useState<Profile[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Form state
  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    serial_number: "",
    launch_date: "",
    book_status: "sell" as BookType,
    author_id: "",
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Deleting state
  const [deletingBook, setDeletingBook] = useState<BookWithAuthor | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const supabase = createClient();
  const toast = useToast();

  const load = useCallback(async () => {
    // Fetch books
    const { data: bData } = await supabase
      .from("books")
      .select("*, author:profiles(full_name, avatar_url, email)")
      .order("created_at", { ascending: false });
    setBooks((bData as BookWithAuthor[]) ?? []);

    // Fetch authors
    const { data: aData } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "author")
      .order("full_name");
    setAuthors((aData as Profile[]) ?? []);

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .single()
          .then(({ data: p }) => setProfile(p as Profile));
      }
    });
    load();
  }, [supabase, load]);

  // Sync realtime
  useRealtimeTable("books", null, load);

  // Filter books by search: Title, Author name, Serial number
  const filteredBooks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return books;
    return books.filter((b) => {
      const titleMatch = b.title.toLowerCase().includes(q);
      const authorMatch = b.author?.full_name?.toLowerCase().includes(q) ?? false;
      const serialMatch = b.serial_number?.toLowerCase().includes(q) ?? false;
      return titleMatch || authorMatch || serialMatch;
    });
  }, [books, search]);

  const generateSerial = useCallback((count: number): string => {
    return `SBP-${String(count + 1).padStart(4, "0")}`;
  }, []);

  const openCreateModal = () => {
    setForm({
      title: "",
      subtitle: "",
      serial_number: generateSerial(books.length),
      launch_date: "",
      book_status: "sell",
      author_id: "",
    });
    setError(null);
    setShowCreate(true);
  };

  const handleCreateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.author_id) {
      setError("Please fill out Title and Assign Author fields.");
      return;
    }
    setCreating(true);
    setError(null);

    try {
      const serial = form.serial_number.trim() || generateSerial(books.length);

      // Create Book record
      const { data: newBook, error: bookErr } = await supabase
        .from("books")
        .insert({
          title: form.title.trim(),
          subtitle: form.subtitle.trim() || null,
          author_id: form.author_id,
          serial_number: serial,
          launch_date: form.launch_date || null,
          book_type: form.book_status,
          royalty_percent: 15,
          current_stage: "submitted",
          progress_percent: 10,
        })
        .select()
        .single();

      if (bookErr) throw bookErr;

      // Initialize Sales record for this book (required for sync)
      await supabase.from("sales").insert({
        book_id: newBook.id,
        copies_sold: 0,
        website_sales: 0,
        amazon_sales: 0,
        monthly_revenue: 0,
        total_revenue: 0,
      });

      // Log activity
      await supabase.from("activity_logs").insert({
        book_id: newBook.id,
        user_id: profile?.id || null,
        action: "book_created",
        entity_type: "book",
        metadata: { title: form.title, serial, book_type: form.book_status },
      });

      toast.success(`Book workspace created successfully!`);
      setShowCreate(false);
      load();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to create book workspace.");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteBook = async () => {
    if (!deletingBook) return;
    setIsDeleting(true);
    try {
      const res = await fetch("/api/admin/delete-book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId: deletingBook.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete book");

      toast.success(`Book "${deletingBook.title}" deleted.`);
      setDeletingBook(null);
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete book.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!profile) return null;

  const totalBooks = books.length;
  const sellBooks = books.filter((b) => (b.book_type ?? "sell") === "sell").length;
  const notForSale = books.filter((b) => b.book_type === "not_for_sell").length;

  return (
    <DashboardShell
      nav={ADMIN_NAV}
      profile={profile}
      brand="Author Dashboard"
      title="Books"
      subtitle="Publishing catalog management"
      actions={
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 hover:bg-violet-500 transition"
        >
          <Plus className="h-4 w-4" /> Add New Book
        </button>
      }
    >
      {/* Top Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-white/5 bg-[#09090b]/80 p-4">
          <p className="text-2xl font-bold text-white font-mono">{totalBooks}</p>
          <p className="text-xs text-zinc-500 mt-0.5">Total Books</p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-[#09090b]/80 p-4">
          <p className="text-2xl font-bold text-white font-mono">{sellBooks}</p>
          <p className="text-xs text-zinc-500 mt-0.5">Sell Books</p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-[#09090b]/80 p-4">
          <p className="text-2xl font-bold text-white font-mono">{notForSale}</p>
          <p className="text-xs text-zinc-500 mt-0.5">Not For Sale</p>
        </div>
      </div>

      {/* Top Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by book title, author name, or serial number..."
          className="w-full rounded-2xl border border-white/10 bg-white/5 py-3.5 pl-11 pr-4 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 focus:shadow-lg focus:shadow-violet-900/20 transition-all font-semibold"
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

      {/* Books Listing */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        </div>
      ) : filteredBooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-500 border border-dashed border-white/10 rounded-3xl">
          <BookOpen className="h-10 w-10 text-zinc-700 mb-2" />
          <p className="text-sm font-semibold">No books found</p>
          <p className="text-xs text-zinc-600 mt-1">Try refining your search term or add a new book.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredBooks.map((book) => (
            <div
              key={book.id}
              className="p-5 rounded-2xl border border-white/5 bg-[#09090b]/80 flex items-center justify-between group hover:border-violet-500/20 transition duration-300"
            >
              <div className="min-w-0 flex-1 mr-4 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[10px] font-bold text-violet-400 border border-violet-500/20 bg-violet-500/5 px-2 py-0.5 rounded-md">
                    {book.serial_number}
                  </span>
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    book.book_type === "not_for_sell"
                      ? "text-orange-400 bg-orange-500/10 border-orange-500/20"
                      : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                  }`}>
                    {book.book_type === "not_for_sell" ? "Not For Sale" : "Sell Book"}
                  </span>
                </div>
                <h3 className="font-bold text-white text-base truncate font-serif leading-snug group-hover:text-violet-300 transition-colors">
                  {book.title}
                </h3>
                {book.subtitle && <p className="text-xs text-zinc-500 truncate">{book.subtitle}</p>}
                <p className="text-xs text-zinc-400 flex items-center gap-1">
                  <User className="h-3.5 w-3.5 text-zinc-500" /> {book.author?.full_name ?? "Unknown Author"}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => setDeletingBook(book)}
                  className="p-2 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/20 transition"
                  title="Delete Book"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <Link
                  href={`/admin/books/${book.id}`}
                  className="h-10 w-10 rounded-xl border border-white/5 bg-white/2 flex items-center justify-center text-zinc-500 group-hover:text-violet-400 group-hover:border-violet-500/20 transition-all"
                >
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── CREATE BOOK WORKSPACE MODAL ────────────────────────────────────── */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#09090b] p-6 shadow-2xl relative"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-5">
                <div>
                  <h3 className="text-base font-bold text-white">Create Book Workspace</h3>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Setup a new book synced to the author dashboard.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-full bg-white/5 p-1.5 text-zinc-400 hover:text-white transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {error && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 mb-4">
                  {error}
                </p>
              )}

              <form onSubmit={handleCreateBook} className="space-y-4">
                {/* Book Title */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Book Title</label>
                  <input
                    required
                    placeholder="Enter book title"
                    className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-xs text-white placeholder-zinc-705 focus:outline-none focus:border-violet-500/30 transition-all font-semibold"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  />
                </div>

                {/* Subtitle */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Subtitle</label>
                  <input
                    placeholder="Enter subtitle (optional)"
                    className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-xs text-white placeholder-zinc-705 focus:outline-none focus:border-violet-500/30 transition-all font-semibold"
                    value={form.subtitle}
                    onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
                  />
                </div>

                {/* Serial Number */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Serial Number</label>
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                    <input
                      required
                      placeholder="SBP-0001"
                      className="w-full rounded-2xl border border-white/10 bg-black/40 pl-11 pr-4 py-3 text-xs text-white placeholder-zinc-705 focus:outline-none focus:border-violet-500/30 transition-all font-mono uppercase"
                      value={form.serial_number}
                      onChange={(e) => setForm((f) => ({ ...f, serial_number: e.target.value.toUpperCase() }))}
                    />
                  </div>
                </div>

                {/* Launch Date */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Launch Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                    <input
                      type="date"
                      className="w-full rounded-2xl border border-white/10 bg-black/40 pl-11 pr-4 py-3 text-xs text-white focus:outline-none focus:border-violet-500/30 transition-all font-semibold"
                      value={form.launch_date}
                      onChange={(e) => setForm((f) => ({ ...f, launch_date: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Book Status */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Book Status</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, book_status: "sell" }))}
                      className={`flex items-center justify-center gap-1.5 py-3 rounded-2xl border text-xs font-bold uppercase tracking-wider transition ${
                        form.book_status === "sell"
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                          : "border-white/10 bg-black/20 text-zinc-500 hover:text-white"
                      }`}
                    >
                      <ShoppingBag className="h-3.5 w-3.5" /> Sell Book
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, book_status: "not_for_sell" }))}
                      className={`flex items-center justify-center gap-1.5 py-3 rounded-2xl border text-xs font-bold uppercase tracking-wider transition ${
                        form.book_status === "not_for_sell"
                          ? "bg-orange-500/10 border-orange-500/30 text-orange-400"
                          : "border-white/10 bg-black/20 text-zinc-500 hover:text-white"
                      }`}
                    >
                      <BookX className="h-3.5 w-3.5" /> Not For Sale
                    </button>
                  </div>
                </div>

                {/* Assign Author Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Assign Author</label>
                  <select
                    required
                    className="w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-xs text-white focus:outline-none focus:border-violet-500/30 transition-all font-semibold"
                    value={form.author_id}
                    onChange={(e) => setForm((f) => ({ ...f, author_id: e.target.value }))}
                  >
                    <option value="">Select Author...</option>
                    {authors.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={creating}
                  className="w-full rounded-2xl bg-white hover:bg-zinc-200 py-3.5 text-xs font-bold text-black uppercase tracking-wider transition disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Creating Workspace…
                    </>
                  ) : (
                    "Create Workspace"
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── DELETE BOOK CONFIRMATION MODAL ────────────────────────────────────── */}
      <AnimatePresence>
        {deletingBook && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl border border-red-500/20 bg-zinc-950 p-6 shadow-2xl relative"
            >
              <h3 className="text-base font-bold text-red-400 mb-2">Delete Book Workspace</h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-6">
                Are you sure you want to delete <span className="text-white font-semibold">"{deletingBook.title}"</span>?
                This will delete the workspace, sales syncing, and other related items. This is irreversible.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeletingBook(null)}
                  className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteBook}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isDeleting && <Loader2 className="h-3 w-3 animate-spin" />}
                  Delete Workspace
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardShell>
  );
}
