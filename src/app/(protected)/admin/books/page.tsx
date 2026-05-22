"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { createClient } from "@/lib/supabase/client";
import { ADMIN_NAV, PUBLISHING_STAGES } from "@/lib/constants";
import type { Profile, Book, BookType } from "@/lib/types/database";
import {
  Plus, Upload, X, Loader2, Search, BookOpen, Filter,
  ChevronDown, Hash, Tag, BadgeCheck, ShoppingBag, BookX,
  ArrowRight, Trash2,
} from "lucide-react";
import { BookCover } from "@/components/books/book-cover";
import { uploadPublic } from "@/lib/storage";
import { useToast } from "@/components/ui/toast";
import { useRealtimeTable } from "@/hooks/use-realtime";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

// ─── Types ───────────────────────────────────────────────────────────────────
type FilterKey = "all" | "sell" | "not_for_sell" | "published" | "editing" | "designing";

type BookWithAuthor = Book & { author?: Profile };

// ─── Stage badge config ───────────────────────────────────────────────────────
const STAGE_COLORS: Record<string, string> = {
  submitted: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20",
  review: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  editing: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  designing: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  isbn_processing: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  printing: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  published: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
};

const FILTERS: { key: FilterKey; label: string; icon?: React.ReactNode }[] = [
  { key: "all", label: "All Books" },
  { key: "sell", label: "Sell Books", icon: <ShoppingBag className="h-3 w-3" /> },
  { key: "not_for_sell", label: "Not For Sell", icon: <BookX className="h-3 w-3" /> },
  { key: "published", label: "Published" },
  { key: "editing", label: "Under Editing" },
  { key: "designing", label: "Designing" },
];

// ─── Serial number badge ──────────────────────────────────────────────────────
function SerialBadge({ serial }: { serial: string | null }) {
  if (!serial) return null;
  return (
    <div className="absolute top-3 left-3 z-10">
      <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/40 bg-violet-950/80 backdrop-blur-sm px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-violet-300 shadow-lg shadow-violet-900/30">
        <Hash className="h-2.5 w-2.5" />
        {serial}
      </span>
    </div>
  );
}

// ─── Book type badge ──────────────────────────────────────────────────────────
function BookTypeBadge({ type }: { type: BookType }) {
  if (type === "not_for_sell") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-400">
        <BookX className="h-2.5 w-2.5" />
        Not For Sell
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
      <ShoppingBag className="h-2.5 w-2.5" />
      Sell Book
    </span>
  );
}

// ─── Book type selector (for creation modal) ──────────────────────────────────
function BookTypeSelector({
  value,
  onChange,
}: {
  value: BookType;
  onChange: (v: BookType) => void;
}) {
  const options: { value: BookType; label: string; desc: string; icon: React.ReactNode; color: string }[] = [
    {
      value: "sell",
      label: "Sell Book",
      desc: "Commercial — earns royalties & sales",
      icon: <ShoppingBag className="h-5 w-5" />,
      color: "emerald",
    },
    {
      value: "not_for_sell",
      label: "Not For Sell",
      desc: "Internal / private — no sales or royalties",
      icon: <BookX className="h-5 w-5" />,
      color: "orange",
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`relative flex flex-col gap-2 rounded-2xl border p-4 text-left transition-all ${
              active
                ? opt.color === "emerald"
                  ? "border-emerald-500/50 bg-emerald-500/10 shadow-lg shadow-emerald-900/20"
                  : "border-orange-500/50 bg-orange-500/10 shadow-lg shadow-orange-900/20"
                : "border-white/10 bg-white/3 hover:border-white/20 hover:bg-white/5"
            }`}
          >
            {active && (
              <div className="absolute top-3 right-3">
                <BadgeCheck
                  className={`h-4 w-4 ${opt.color === "emerald" ? "text-emerald-400" : "text-orange-400"}`}
                />
              </div>
            )}
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                active
                  ? opt.color === "emerald"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-orange-500/20 text-orange-400"
                  : "bg-white/8 text-zinc-400"
              }`}
            >
              {opt.icon}
            </div>
            <div>
              <p className={`text-sm font-bold ${active ? "text-white" : "text-zinc-300"}`}>{opt.label}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">{opt.desc}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Book Card ────────────────────────────────────────────────────────────────
function BookCard({ book, onDelete }: { book: BookWithAuthor; onDelete: (book: BookWithAuthor) => void }) {
  const stageLabel = PUBLISHING_STAGES.find((s) => s.key === book.current_stage)?.label ?? book.current_stage;
  const stageColor = STAGE_COLORS[book.current_stage] ?? "text-zinc-400 bg-zinc-500/10 border-zinc-500/20";

  return (
    <Link href={`/admin/books/${book.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
        className="group relative overflow-hidden rounded-2xl border border-white/8 bg-zinc-900/60 hover:border-violet-500/30 hover:shadow-xl hover:shadow-violet-900/20 transition-all duration-300"
      >
        {/* Cover image */}
        <div className="relative aspect-[16/9] bg-zinc-950 overflow-hidden">
          <BookCover title={book.title} coverUrl={book.cover_url} className="group-hover:scale-[1.03] transition duration-500" />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />
          {/* Serial number badge */}
          <SerialBadge serial={book.serial_number} />
          {/* Book type badge top-right */}
          <div className="absolute top-3 right-3 z-10">
            <BookTypeBadge type={book.book_type ?? "sell"} />
          </div>
        </div>

        {/* Card body */}
        <div className="p-5 space-y-3">
          <div>
            <h3 className="text-base font-bold text-white leading-tight group-hover:text-violet-300 transition line-clamp-2">
              {book.title}
            </h3>
            {book.subtitle && (
              <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{book.subtitle}</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-400 flex items-center gap-1.5 text-ellipsis overflow-hidden whitespace-nowrap pr-2">
              <span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-300 flex items-center justify-center text-[9px] font-bold shrink-0">
                {book.author?.full_name?.[0] ?? "A"}
              </span>
              {book.author?.full_name ?? "Unknown Author"}
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(book);
                }}
                className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition"
                title="Delete Book"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <ArrowRight className="h-4 w-4 text-zinc-700 group-hover:text-violet-400 transition" />
            </div>
          </div>

          {/* Stage + Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${stageColor}`}>
                {stageLabel}
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">{book.progress_percent}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-violet-500 to-purple-400 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${book.progress_percent}%` }}
                transition={{ delay: 0.1, duration: 0.6, ease: "easeOut" }}
              />
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminBooksPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [books, setBooks] = useState<BookWithAuthor[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    author_id: "",
    genre: "",
    launch_date: "",
    description: "",
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
      .select("*, author:profiles(full_name, avatar_url, email)")
      .order("created_at", { ascending: false });
    setBooks((data as BookWithAuthor[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user)
        supabase.from("profiles").select("*").eq("id", data.user.id).single().then(({ data }) => setProfile(data as Profile));
    });
    load();
    supabase.from("profiles").select("id, full_name").eq("role", "author").then(({ data }) => setAuthors((data as Profile[]) ?? []));
  }, [supabase, load]);

  useRealtimeTable("books", null, load);

  // ─── Search + Filter ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = books;

    // Filter by type / stage
    if (activeFilter === "sell") list = list.filter((b) => (b.book_type ?? "sell") === "sell");
    else if (activeFilter === "not_for_sell") list = list.filter((b) => b.book_type === "not_for_sell");
    else if (activeFilter === "published") list = list.filter((b) => b.current_stage === "published");
    else if (activeFilter === "editing") list = list.filter((b) => b.current_stage === "editing");
    else if (activeFilter === "designing") list = list.filter((b) => b.current_stage === "designing");

    // Search
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.serial_number?.toLowerCase().includes(q) ||
          b.author?.full_name?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [books, search, activeFilter]);

  // ─── Cover handler ──────────────────────────────────────────────────────────
  function handleCoverSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setCoverPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  // ─── Generate serial number ─────────────────────────────────────────────────
  function generateSerial(count: number): string {
    return `SBP-${String(count + 1).padStart(4, "0")}`;
  }

  // ─── Create book ────────────────────────────────────────────────────────────
  async function createBook(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setCreatingBook(true);

    try {
      // Use manually set serial number, fallback if blank
      const serial = form.serial_number.trim() || generateSerial(books.length);

      const { data: newBook, error } = await supabase
        .from("books")
        .insert({
          title: form.title,
          subtitle: form.subtitle || null,
          author_id: form.author_id,
          genre: form.genre || null,
          launch_date: form.launch_date || null,
          royalty_percent: 15,
          current_stage: "submitted",
          progress_percent: 10,
          book_type: form.book_type,
          serial_number: serial,
        })
        .select("id")
        .single();

      if (error) throw error;
      if (!newBook) throw new Error("Could not create book entry.");

      if (coverFile) {
        const { publicUrl } = await uploadPublic("book-covers", newBook.id, coverFile, "cover-");
        await supabase.from("books").update({ cover_url: publicUrl }).eq("id", newBook.id);
      }

      const { data: user } = await supabase.auth.getUser();
      if (user?.user) {
        await supabase.from("activity_logs").insert({
          book_id: newBook.id,
          user_id: user.user.id,
          action: "book_created",
          entity_type: "book",
          metadata: { title: form.title, serial, book_type: form.book_type },
        });
      }

      toast.success(`Book created! Serial: ${serial}`);
      setShowCreate(false);
      setForm({ title: "", subtitle: "", author_id: "", genre: "", launch_date: "", description: "", book_type: "sell", serial_number: "" });
      setCoverFile(null);
      setCoverPreview(null);
      load();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Error creating book");
      toast.error("Failed to create book.");
    } finally {
      setCreatingBook(false);
    }
  }

  function closeModal() {
    setShowCreate(false);
    setForm({ title: "", subtitle: "", author_id: "", genre: "", launch_date: "", description: "", book_type: "sell", serial_number: "" });
    setCoverFile(null);
    setCoverPreview(null);
    setCreateError(null);
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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete book.");
    } finally {
      setIsDeleting(false);
    }
  }

  if (!profile) return null;

  const sellCount = books.filter((b) => (b.book_type ?? "sell") === "sell").length;
  const notForSellCount = books.filter((b) => b.book_type === "not_for_sell").length;

  return (
    <DashboardShell
      nav={ADMIN_NAV}
      profile={profile}
      brand="Mission Control"
      title="Books"
      subtitle="Publishing catalog"
      actions={
        <button
          onClick={() => {
            setForm({
              title: "",
              subtitle: "",
              author_id: "",
              genre: "",
              launch_date: "",
              description: "",
              book_type: "sell",
              serial_number: generateSerial(books.length),
            });
            setShowCreate(true);
          }}
          className="flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 hover:bg-violet-500 transition"
        >
          <Plus className="h-4 w-4" /> New Book
        </button>
      }
    >
      {/* ── Stats Row ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Books", value: books.length, color: "violet" },
          { label: "Sell Books", value: sellCount, color: "emerald" },
          { label: "Not For Sell", value: notForSellCount, color: "orange" },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`rounded-2xl border p-4 ${
              stat.color === "violet"
                ? "border-violet-500/20 bg-violet-950/20"
                : stat.color === "emerald"
                ? "border-emerald-500/20 bg-emerald-950/20"
                : "border-orange-500/20 bg-orange-950/20"
            }`}
          >
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* ── Search + Filter Bar ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search books, serial numbers, authors..."
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

        {/* Filter dropdown */}
        <div className="relative">
          <button
            onClick={() => setFilterOpen((p) => !p)}
            className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm font-semibold text-zinc-300 hover:bg-white/8 transition"
          >
            <Filter className="h-4 w-4 text-violet-400" />
            {FILTERS.find((f) => f.key === activeFilter)?.label}
            <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
          </button>
          <AnimatePresence>
            {filterOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.97 }}
                className="absolute right-0 top-full mt-2 w-48 rounded-2xl border border-white/10 bg-zinc-950/95 backdrop-blur-xl shadow-2xl z-50 overflow-hidden py-1"
              >
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => { setActiveFilter(f.key); setFilterOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm font-medium flex items-center gap-2 transition ${
                      activeFilter === f.key
                        ? "text-violet-300 bg-violet-500/10"
                        : "text-zinc-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {f.icon}
                    {f.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Result count */}
        <span className="text-xs text-zinc-600 whitespace-nowrap">
          {filtered.length} of {books.length} books
        </span>
      </div>

      {/* ── Filter Pill Row ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
              activeFilter === f.key
                ? "border-violet-500/50 bg-violet-500/15 text-violet-300"
                : "border-white/8 bg-white/3 text-zinc-500 hover:border-white/15 hover:text-zinc-300"
            }`}
          >
            {f.icon}
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Books Grid ────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-2xl border border-white/8 bg-zinc-900/60 p-5 space-y-4">
              <Skeleton className="aspect-[16/9] w-full rounded-xl shimmer" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-2/3 rounded shimmer" />
                <Skeleton className="h-3 w-1/2 rounded shimmer" />
              </div>
              <div className="flex justify-between items-center pt-2">
                <Skeleton className="h-5 w-24 rounded-full shimmer" />
                <Skeleton className="h-5 w-8 rounded shimmer" />
              </div>
              <div className="space-y-1 pt-1">
                <Skeleton className="h-1.5 w-full rounded-full shimmer" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="col-span-full">
          <EmptyState
            icon={BookOpen}
            title={search ? "No results found" : "Your catalog is empty"}
            description={
              search
                ? `We couldn't find any books matching "${search}". Try adjusting your filters or search terms.`
                : "There are no books in the publication catalogue. Create a new book workspace to begin."
            }
            color="violet"
            action={
              !search ? (
                <button
                  onClick={() => {
                    setForm({
                      title: "",
                      subtitle: "",
                      author_id: "",
                      genre: "",
                      launch_date: "",
                      description: "",
                      book_type: "sell",
                      serial_number: generateSerial(books.length),
                    });
                    setShowCreate(true);
                  }}
                  className="rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-violet-500 transition shadow-lg shadow-violet-500/15"
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
            <BookCard key={book.id} book={book} onDelete={setDeletingBookItem} />
          ))}
        </div>
      )}

      {/* ── Create Book Modal ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 8 }}
              transition={{ type: "spring", damping: 22, stiffness: 300 }}
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-3xl border border-white/10 bg-zinc-950/95 shadow-2xl backdrop-blur-xl"
            >
              {/* Modal header */}
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/5 bg-zinc-950/95 backdrop-blur-xl px-8 py-5">
                <div>
                  <h3 className="text-lg font-bold text-white">Create New Book</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Initialize a new publishing workspace</p>
                </div>
                <button onClick={closeModal} className="rounded-full bg-white/5 p-2 text-zinc-400 hover:text-white transition">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={createBook} className="p-8 space-y-6">
                {createError && (
                  <p className="text-sm text-red-400 bg-red-500/10 rounded-xl px-4 py-3 border border-red-500/20">
                    {createError}
                  </p>
                )}

                {/* Book Type Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Book Classification *
                  </label>
                  <BookTypeSelector
                    value={form.book_type}
                    onChange={(v) => setForm((f) => ({ ...f, book_type: v }))}
                  />
                </div>

                <div className="border-t border-white/5" />

                {/* Title + Subtitle */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Book Title *</label>
                    <input
                      required
                      placeholder="Enter title"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition"
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Subtitle</label>
                    <input
                      placeholder="Enter subtitle"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition"
                      value={form.subtitle}
                      onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Author + Genre */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Author Assignment *</label>
                    <select
                      required
                      className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500 transition"
                      value={form.author_id}
                      onChange={(e) => setForm((f) => ({ ...f, author_id: e.target.value }))}
                    >
                      <option value="" className="bg-zinc-950 text-zinc-400">Select author</option>
                      {authors.map((a) => (
                        <option key={a.id} value={a.id} className="bg-zinc-950 text-white">{a.full_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Genre</label>
                    <input
                      placeholder="e.g. Fiction, Business..."
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition"
                      value={form.genre}
                      onChange={(e) => setForm((f) => ({ ...f, genre: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Launch Date + Description */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Launch Date</label>
                    <input
                      type="date"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500 transition"
                      value={form.launch_date}
                      onChange={(e) => setForm((f) => ({ ...f, launch_date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Description</label>
                    <textarea
                      placeholder="Brief book description..."
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition min-h-[46px] max-h-[80px] resize-none"
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Cover Upload */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Book Cover</label>
                  {coverPreview ? (
                    <div className="relative rounded-xl bg-zinc-950 overflow-hidden border border-white/10 max-h-[140px] flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={coverPreview} alt="Cover preview" className="object-cover h-[140px] w-full opacity-80" />
                      <button
                        type="button"
                        onClick={() => { setCoverFile(null); setCoverPreview(null); }}
                        className="absolute top-2 right-2 bg-black/70 hover:bg-black/90 rounded-full p-1.5 text-zinc-400 hover:text-white transition"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/3 hover:bg-white/6 cursor-pointer transition py-8 text-zinc-500 hover:text-zinc-300">
                      <Upload className="h-6 w-6" />
                      <span className="text-xs font-medium">Select cover image</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleCoverSelect} />
                    </label>
                  )}
                </div>

                {/* Serial Number Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Serial Number *</label>
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-400 pointer-events-none" />
                    <input
                      required
                      placeholder="e.g. SBP-0001"
                      className="w-full rounded-xl border border-white/10 bg-white/5 pl-11 pr-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition font-mono uppercase"
                      value={form.serial_number}
                      onChange={(e) => setForm((f) => ({ ...f, serial_number: e.target.value.toUpperCase() }))}
                    />
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-0.5">
                    Pre-populated with default format. You can customize this serial number manually.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2 border-t border-white/5">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-xl border border-white/15 px-5 py-2.5 text-sm font-semibold text-zinc-400 hover:text-white transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingBook}
                    className="rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-violet-500 disabled:opacity-50 transition flex items-center gap-2"
                  >
                    {creatingBook && <Loader2 className="h-4 w-4 animate-spin" />}
                    Create Book Workspace
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Delete Book Confirmation Modal ────────────────────────────────────── */}
      <AnimatePresence>
        {deletingBookItem && (
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
                  <h3 className="text-base font-bold">Delete Book Workspace</h3>
                </div>
                <button
                  onClick={() => setDeletingBookItem(null)}
                  className="rounded-full bg-white/5 p-1.5 text-zinc-400 hover:text-white transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-sm text-zinc-300">
                  Are you sure you want to permanently delete the book{" "}
                  <span className="text-white font-semibold">"{deletingBookItem.title}"</span>?
                </p>
                
                <div className="rounded-xl border border-red-500/20 bg-red-950/20 px-4 py-3">
                  <p className="text-xs text-red-300 leading-relaxed">
                    <strong>Warning:</strong> This action is permanent and will delete the book's manuscript, cover design files, conversations, activity logs, and transaction records.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/5 bg-zinc-900/20">
                <button
                  type="button"
                  onClick={() => setDeletingBookItem(null)}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDeleteBook}
                  className="rounded-xl bg-red-600 px-5 py-2 text-xs font-bold text-white hover:bg-red-500 disabled:opacity-50 transition flex items-center gap-2 shadow-lg shadow-red-950/30"
                >
                  {isDeleting && <Loader2 className="h-3 w-3 animate-spin" />}
                  Delete Book
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardShell>
  );
}
