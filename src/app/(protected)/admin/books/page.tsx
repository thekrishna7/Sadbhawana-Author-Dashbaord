"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { createClient } from "@/lib/supabase/client";
import { ADMIN_NAV } from "@/lib/constants";
import type { Profile, Book, BookType } from "@/lib/types/database";
import {
  Plus, Upload, X, Loader2, Search, BookOpen, Hash, Tag,
  BadgeCheck, ShoppingBag, BookX, ArrowRight, Trash2
} from "lucide-react";
import { BookCover } from "@/components/books/book-cover";
import { uploadPublic } from "@/lib/storage";
import { useToast } from "@/components/ui/toast";
import { useRealtimeTable } from "@/hooks/use-realtime";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

type BookWithAuthor = Book & { author?: Profile };

export default function AdminBooksPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [books, setBooks] = useState<BookWithAuthor[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Form fields
  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    author_id: "",
    launch_date: "",
    book_type: "sell" as BookType,
    serial_number: "",
  });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [authors, setAuthors] = useState<Profile[]>([]);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creatingBook, setCreatingBook] = useState(false);
  const [deletingBookItem, setDeletingBookItem] = useState<BookWithAuthor | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const supabase = createClient();
  const toast = useToast();

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("books")
      .select("*, author:profiles!author_id(full_name, avatar_url, email)")
      .order("created_at", { ascending: false });
    setBooks((data as BookWithAuthor[]) ?? []);
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
          .then(({ data }) => setProfile(data as Profile));
    });
    load();
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "author")
      .order("full_name")
      .then(({ data }) => setAuthors((data as Profile[]) ?? []));
  }, [supabase, load]);

  useRealtimeTable("books", null, load);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return books;
    return books.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        (b.serial_number ?? "").toLowerCase().includes(q) ||
        (b.author?.full_name ?? "").toLowerCase().includes(q)
    );
  }, [books, search]);

  function handleCoverSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setCoverPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  function generateSerial(count: number): string {
    return `SBP-${String(count + 1).padStart(4, "0")}`;
  }

  async function createBook(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setCreatingBook(true);

    try {
      const serial = form.serial_number.trim() || generateSerial(books.length);

      const { data: newBook, error } = await supabase
        .from("books")
        .insert({
          title: form.title,
          subtitle: form.subtitle || null,
          author_id: form.author_id,
          royalty_percent: 15,
          current_stage: "submitted",
          progress_percent: 10,
          book_type: form.book_type,
          serial_number: serial,
          launch_date: form.launch_date || null,
        })
        .select("id")
        .single();

      if (error) throw error;
      if (!newBook) throw new Error("Could not create book entry.");

      if (coverFile) {
        const { publicUrl } = await uploadPublic("book-covers", newBook.id, coverFile, "cover-");
        await supabase.from("books").update({ cover_url: publicUrl }).eq("id", newBook.id);
      }

      // Add to activity logs
      await supabase.from("activity_logs").insert({
        book_id: newBook.id,
        user_id: profile?.id,
        action: "book_created",
        entity_type: "book",
        metadata: { title: form.title, serial, book_type: form.book_type },
      });

      toast.success(`Book workspace created! Serial: ${serial}`);
      setShowCreate(false);
      setForm({ title: "", subtitle: "", author_id: "", launch_date: "", book_type: "sell", serial_number: "" });
      setCoverFile(null);
      setCoverPreview(null);
      load();
    } catch (err: any) {
      setCreateError(err.message || "Error creating book");
      toast.error("Failed to create book.");
    } finally {
      setCreatingBook(false);
    }
  }

  async function handleDeleteBook() {
    if (!deletingBookItem) return;
    setIsDeleting(true);
    try {
      const res = await fetch("/api/admin/delete-book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId: deletingBookItem.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete book");

      toast.success(`Book "${deletingBookItem.title}" deleted successfully.`);
      setDeletingBookItem(null);
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete book.");
    } finally {
      setIsDeleting(false);
    }
  }

  if (!profile) return null;

  return (
    <DashboardShell
      nav={ADMIN_NAV}
      profile={profile}
      brand="Author Dashboard"
      title="Books"
      subtitle="HQ publishing catalog and workspace manager"
      actions={
        <button
          onClick={() => {
            setForm({
              title: "",
              subtitle: "",
              author_id: "",
              launch_date: "",
              book_type: "sell",
              serial_number: generateSerial(books.length),
            });
            setShowCreate(true);
          }}
          className="flex items-center gap-2 rounded-2xl bg-white hover:bg-zinc-200 px-5 py-2.5 text-xs font-bold text-black uppercase tracking-wider transition"
        >
          <Plus className="h-4 w-4" /> Add Book
        </button>
      }
    >
      {/* Small Simple Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-2xl border border-white/5 bg-[#09090b]/80 p-4 relative overflow-hidden">
          <p className="text-xl font-bold text-white font-mono">{books.length}</p>
          <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider mt-0.5">Total Books</p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-[#09090b]/80 p-4 relative overflow-hidden">
          <p className="text-xl font-bold text-white font-mono">
            {books.filter((b) => (b.book_type ?? "sell") === "sell").length}
          </p>
          <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider mt-0.5">Sell Books</p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-[#09090b]/80 p-4 relative overflow-hidden">
          <p className="text-xl font-bold text-white font-mono">
            {books.filter((b) => b.book_type === "not_for_sell").length}
          </p>
          <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider mt-0.5">Not For Sale</p>
        </div>
      </div>

      {/* Search and stats bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, author, or serial..."
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
          {filtered.length} of {books.length} books
        </span>
      </div>

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-white/5 bg-zinc-900/40 p-5 space-y-4">
              <Skeleton className="aspect-[16/9] w-full rounded-xl shimmer" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-2/3 rounded shimmer" />
                <Skeleton className="h-3 w-1/2 rounded shimmer" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="col-span-full">
          <EmptyState
            icon={BookOpen}
            title={search ? "No books found" : "Catalogue is empty"}
            description={
              search
                ? `We couldn't find any books matching "${search}".`
                : "No book workspaces have been initialized. Click Add Book to create one."
            }
            color="amber"
            action={
              !search ? (
                <button
                  onClick={() => setShowCreate(true)}
                  className="rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-black hover:bg-zinc-200 transition shadow-lg"
                >
                  Create Book
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
          {filtered.map((book) => (
            <Link key={book.id} href={`/admin/books/${book.id}`} className="block">
              <div className="group relative overflow-hidden rounded-2xl border border-white/5 bg-[#09090b]/80 hover:border-amber-500/20 transition-all duration-300">
                {/* Book Cover Container */}
                <div className="relative aspect-[16/9] bg-zinc-950 overflow-hidden">
                  <BookCover title={book.title} coverUrl={book.cover_url} className="group-hover:scale-[1.03] transition duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />
                  {/* Serial badge */}
                  {book.serial_number && (
                    <div className="absolute top-3 left-3 z-10">
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-black/80 backdrop-blur-sm px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-amber-500 shadow-md">
                        <Hash className="h-2 w-2" />
                        {book.serial_number}
                      </span>
                    </div>
                  )}
                  {/* Classification badge */}
                  <div className="absolute top-3 right-3 z-10">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                      book.book_type === "not_for_sell"
                        ? "border-orange-500/30 bg-orange-500/15 text-orange-400"
                        : "border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
                    }`}>
                      {book.book_type === "not_for_sell" ? "Not For Sale" : "Sell Book"}
                    </span>
                  </div>
                </div>

                {/* Body details */}
                <div className="p-5 flex flex-col justify-between min-h-[120px]">
                  <div>
                    <h3 className="text-sm font-bold text-white font-serif leading-snug group-hover:text-amber-400 transition line-clamp-1">
                      {book.title}
                    </h3>
                    {book.subtitle && <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{book.subtitle}</p>}
                  </div>

                  <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-3">
                    <p className="text-[10px] text-zinc-400 truncate max-w-[70%]">
                      Author: <span className="text-zinc-300 font-semibold">{book.author?.full_name ?? "Unassigned"}</span>
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDeletingBookItem(book);
                        }}
                        className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/20 transition"
                        title="Delete Book"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <ArrowRight className="h-4 w-4 text-zinc-700 group-hover:text-amber-500 transition-colors" />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Add New Book Modal */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#09090b] p-6 shadow-2xl relative"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                <div>
                  <h3 className="text-base font-bold text-white">Add New Book</h3>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Initialize a new book companion workspace.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-full bg-white/5 p-1.5 text-zinc-400 hover:text-white transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {createError && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 mb-4">
                  {createError}
                </p>
              )}

              <form onSubmit={createBook} className="space-y-4">
                {/* Book Title */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Book Title *</label>
                  <input
                    required
                    placeholder="Enter book title"
                    className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-amber-500/30 transition-all font-semibold"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  />
                </div>

                {/* Subtitle */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Subtitle</label>
                  <input
                    placeholder="Enter book subtitle"
                    className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-amber-500/30 transition-all font-semibold"
                    value={form.subtitle}
                    onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
                  />
                </div>

                {/* Dynamic Author Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Assign Author *</label>
                  <select
                    required
                    className="w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500/30 transition-all font-semibold"
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

                {/* Serial Number & Launch Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Serial Number *</label>
                    <input
                      required
                      placeholder="SBP-0001"
                      className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-amber-500/30 transition-all font-semibold font-mono uppercase"
                      value={form.serial_number}
                      onChange={(e) => setForm((f) => ({ ...f, serial_number: e.target.value.toUpperCase() }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Launch Date</label>
                    <input
                      type="date"
                      className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500/30 transition-all font-semibold"
                      value={form.launch_date}
                      onChange={(e) => setForm((f) => ({ ...f, launch_date: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Status Selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Book Status</label>
                  <select
                    className="w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500/30 transition-all font-semibold"
                    value={form.book_type}
                    onChange={(e) => setForm((f) => ({ ...f, book_type: e.target.value as BookType }))}
                  >
                    <option value="sell">Sell Book</option>
                    <option value="not_for_sell">Not For Sale</option>
                  </select>
                </div>

                {/* Cover File Upload */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Book Cover</label>
                  {coverPreview ? (
                    <div className="relative rounded-2xl overflow-hidden border border-white/10 max-h-[100px] flex items-center justify-center bg-black">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={coverPreview} alt="Cover preview" className="object-cover h-[100px] w-full opacity-80" />
                      <button
                        type="button"
                        onClick={() => { setCoverFile(null); setCoverPreview(null); }}
                        className="absolute top-2 right-2 bg-black/70 hover:bg-black/90 rounded-full p-1.5 text-zinc-400 hover:text-white transition"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center p-4 rounded-2xl border border-dashed border-white/15 bg-white/3 hover:bg-white/5 cursor-pointer transition text-zinc-500 hover:text-zinc-300">
                      <Upload className="h-4 w-4 mb-1 text-amber-500" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Upload Cover</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleCoverSelect} />
                    </label>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={creatingBook}
                  className="w-full rounded-2xl bg-white hover:bg-zinc-200 py-3.5 text-xs font-bold text-black uppercase tracking-wider transition disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
                >
                  {creatingBook ? (
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

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingBookItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl border border-red-500/20 bg-zinc-950 p-6 shadow-2xl relative"
            >
              <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-red-500/20 to-transparent" />
              <h3 className="text-base font-bold text-red-400 mb-2">Delete Book</h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-6">
                Are you sure you want to permanently delete the book workspace for <span className="text-white font-semibold">"{deletingBookItem.title}"</span>?
                This will delete all sales details, manuscripts, cover assets, and associated logs.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeletingBookItem(null)}
                  className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  disabled={isDeleting}
                  onClick={handleDeleteBook}
                  className="px-4 py-2 rounded-xl bg-red-650 hover:bg-red-500 text-xs font-bold text-white transition flex items-center gap-1.5"
                >
                  {isDeleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
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
