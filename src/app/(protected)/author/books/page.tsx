"use client";

import { useEffect, useState, useCallback } from "react";
import { AuthorShell } from "@/components/layout/author-shell";
import { createClient } from "@/lib/supabase/client";
import { PUBLISHING_STAGES } from "@/lib/constants";
import type { Profile, Book, Sales } from "@/lib/types/database";
import { ChevronRight, BookOpen, X, Loader2, BarChart2, Coins } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRealtimeTable } from "@/hooks/use-realtime";

export default function AuthorBooksPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [books, setBooks] = useState<(Book & { sales?: any })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBook, setSelectedBook] = useState<(Book & { sales?: any }) | null>(null);
  const [breakdownType, setBreakdownType] = useState<"amazon" | "website" | null>(null);

  const supabase = createClient();

  const loadBooks = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Load Profile
    const { data: p } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    setProfile(p as Profile);

    // Load Books and join Sales
    const { data: b } = await supabase
      .from("books")
      .select("*, sales(*)")
      .eq("author_id", user.id)
      .order("created_at", { ascending: false });

    setBooks((b as any[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  useRealtimeTable("books", null, loadBooks);
  useRealtimeTable("sales", null, loadBooks);

  const getStageLabel = (stageKey: string) => {
    const stage = PUBLISHING_STAGES.find((s) => s.key === stageKey);
    return stage ? stage.label : "Received";
  };

  const getStageColorClass = (stageKey: string) => {
    switch (stageKey) {
      case "submitted":
        return "text-zinc-500 border-zinc-500/20 bg-zinc-500/5";
      case "review":
        return "text-purple-400 border-purple-500/20 bg-purple-500/5";
      case "editing":
        return "text-blue-400 border-blue-500/20 bg-blue-500/5";
      case "designing":
        return "text-pink-400 border-pink-500/20 bg-pink-500/5";
      case "isbn_processing":
        return "text-amber-400 border-amber-500/20 bg-amber-500/5";
      case "printing":
        return "text-teal-400 border-teal-500/20 bg-teal-500/5";
      case "published":
        return "text-emerald-400 border-emerald-500/25 bg-emerald-500/5";
      default:
        return "text-zinc-500 border-zinc-500/20 bg-zinc-500/5";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030303] text-zinc-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <AuthorShell title="My Books">
      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white font-serif">Bookshelf</h2>
          <p className="text-xs text-zinc-500">Your assigned publishing catalogs.</p>
        </div>

        {/* Assigned Books List */}
        <div className="space-y-4">
          {books.map((book) => (
            <div
              key={book.id}
              onClick={() => setSelectedBook(book)}
              className="p-5 rounded-2xl border border-white/5 bg-[#09090b]/80 flex items-center justify-between group hover:border-amber-500/20 transition duration-300 cursor-pointer"
            >
              <div className="min-w-0 flex-1 mr-4 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[10px] font-bold text-amber-400 border border-amber-500/20 bg-amber-500/5 px-2 py-0.5 rounded-md">
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
                <h3 className="font-bold text-white text-base truncate font-serif leading-snug group-hover:text-amber-400 transition-colors">
                  {book.title}
                </h3>
                {book.subtitle && <p className="text-xs text-zinc-500 truncate">{book.subtitle}</p>}
              </div>

              <div className="h-10 w-10 rounded-xl border border-white/5 bg-white/2 flex items-center justify-center text-zinc-500 group-hover:text-amber-400 group-hover:border-amber-500/20 transition-all shrink-0">
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          ))}

          {books.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-500 text-center space-y-3">
              <BookOpen className="h-10 w-10 text-zinc-700" />
              <p className="text-sm font-semibold">No books linked yet</p>
              <p className="text-xs text-zinc-600 max-w-[280px]">
                Administrators must link your author account profile to your book in the HQ system before details appear.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── SALES DETAIL POPUP MODAL ────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedBook && (() => {
          // Resolve sales data safely whether it is returned as an array or a single object by PostgREST
          const salesArray = selectedBook.sales;
          const sales: Sales | null = Array.isArray(salesArray) 
            ? (salesArray[0] as Sales || null) 
            : (salesArray as Sales || null);

          const websiteSold = sales?.website_sales ?? 0;
          const amazonSold = sales?.amazon_sales ?? 0;
          const totalSold = sales?.copies_sold ?? (websiteSold + amazonSold);

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-[#09090b] p-6 shadow-2xl relative"
              >
                {/* Accent Glow Top Border */}
                <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />

                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-5">
                  <div className="min-w-0 pr-4">
                    <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Sales report</h3>
                    <h2 className="text-base font-bold text-white truncate font-serif mt-0.5">{selectedBook.title}</h2>
                  </div>
                  <button
                    onClick={() => { setSelectedBook(null); setBreakdownType(null); }}
                    className="rounded-full bg-white/5 p-1.5 text-zinc-400 hover:text-white transition shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Sales Figure Cards */}
                <div className="space-y-4">
                  {/* Website sales (Clickable Card) */}
                  <div className="space-y-2">
                    <button
                      onClick={() => setBreakdownType(breakdownType === "website" ? null : "website")}
                      className={`w-full flex justify-between items-center p-3.5 rounded-2xl border transition-all ${
                        breakdownType === "website"
                          ? "border-amber-500/30 bg-amber-500/5 text-amber-500"
                          : "border-white/5 bg-white/2 hover:border-amber-500/20 text-zinc-400"
                      }`}
                    >
                      <span className="text-xs font-medium">Website Sold</span>
                      <span className="text-sm font-extrabold text-white font-mono">{websiteSold}</span>
                    </button>
                    
                    {/* Expandable Website Monthly Breakdown */}
                    {breakdownType === "website" && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden rounded-2xl border border-white/5 bg-black/40 p-3.5 space-y-2"
                      >
                        <p className="text-[9px] font-bold text-zinc-550 uppercase tracking-wider mb-1 border-b border-white/5 pb-1 text-left">Month-wise Website Sales</p>
                        {(() => {
                          const websiteSalesMonthly = ((sales as any)?.website_sales_monthly ?? {}) as Record<string, any>;
                          return Object.keys(websiteSalesMonthly).length === 0 ? (
                            <p className="text-[10px] text-zinc-600 italic text-left">No monthly breakdown available.</p>
                          ) : (
                            Object.entries(websiteSalesMonthly).map(([month, count]) => (
                              <div key={month} className="flex justify-between items-center text-xs">
                                <span className="text-zinc-400">{month}</span>
                                <span className="font-semibold text-white font-mono">{count} sales</span>
                              </div>
                            ))
                          );
                        })()}
                        <div className="flex justify-between items-center text-[10px] font-bold text-amber-500 border-t border-white/5 pt-2 mt-1">
                          <span>Total Website Sales</span>
                          <span className="font-mono">{websiteSold}</span>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Amazon sales (Clickable Card) */}
                  <div className="space-y-2">
                    <button
                      onClick={() => setBreakdownType(breakdownType === "amazon" ? null : "amazon")}
                      className={`w-full flex justify-between items-center p-3.5 rounded-2xl border transition-all ${
                        breakdownType === "amazon"
                          ? "border-amber-500/30 bg-amber-500/5 text-amber-500"
                          : "border-white/5 bg-white/2 hover:border-amber-500/20 text-zinc-400"
                      }`}
                    >
                      <span className="text-xs font-medium">Amazon Sold</span>
                      <span className="text-sm font-extrabold text-white font-mono">{amazonSold}</span>
                    </button>
                    
                    {/* Expandable Amazon Monthly Breakdown */}
                    {breakdownType === "amazon" && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden rounded-2xl border border-white/5 bg-black/40 p-3.5 space-y-2"
                      >
                        <p className="text-[9px] font-bold text-zinc-555 uppercase tracking-wider mb-1 border-b border-white/5 pb-1 text-left">Month-wise Amazon Sales</p>
                        {(() => {
                          const amazonSalesMonthly = ((sales as any)?.amazon_sales_monthly ?? {}) as Record<string, any>;
                          return Object.keys(amazonSalesMonthly).length === 0 ? (
                            <p className="text-[10px] text-zinc-600 italic text-left">No monthly breakdown available.</p>
                          ) : (
                            Object.entries(amazonSalesMonthly).map(([month, count]) => (
                              <div key={month} className="flex justify-between items-center text-xs">
                                <span className="text-zinc-400">{month}</span>
                                <span className="font-semibold text-white font-mono">{count} sales</span>
                              </div>
                            ))
                          );
                        })()}
                        <div className="flex justify-between items-center text-[10px] font-bold text-amber-500 border-t border-white/5 pt-2 mt-1">
                          <span>Total Amazon Sales</span>
                          <span className="font-mono">{amazonSold}</span>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Total sales */}
                  <div className="flex justify-between items-center p-4 rounded-2xl border border-amber-500/10 bg-amber-500/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-12 h-12 bg-amber-500/5 rounded-full blur-[20px] pointer-events-none" />
                    <span className="text-xs text-amber-500 font-bold">Total Sold</span>
                    <span className="text-base font-black text-amber-500 font-mono">{totalSold}</span>
                  </div>
                </div>

                <button
                  onClick={() => { setSelectedBook(null); setBreakdownType(null); }}
                  className="mt-6 w-full rounded-2xl bg-white hover:bg-zinc-200 py-3 font-semibold text-xs text-black uppercase tracking-wider transition"
                >
                  Close Report
                </button>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </AuthorShell>
  );
}
