"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ADMIN_NAV } from "@/lib/constants";
import type { Profile, Book, Sales } from "@/lib/types/database";
import { ArrowLeft, Loader2, Save, ShoppingBag, BookOpen } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { motion } from "framer-motion";

export default function AdminBookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [bookId, setBookId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [book, setBook] = useState<(Book & { author?: Profile }) | null>(null);
  const [salesRecord, setSalesRecord] = useState<Sales | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [amazonSales, setAmazonSales] = useState(0);
  const [websiteSales, setWebsiteSales] = useState(0);
  const [saving, setSaving] = useState(false);

  const supabase = createClient();
  const toast = useToast();
  const router = useRouter();

  useEffect(() => {
    params.then((p) => setBookId(p.id));
    
    supabase.auth.getUser().then(({ data }) => {
      if (data.user)
        supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .single()
          .then(({ data }) => setProfile(data as Profile));
    });
  }, [params, supabase]);

  const loadData = useCallback(async (id: string) => {
    try {
      const { data: b, error: bErr } = await supabase
        .from("books")
        .select("*, author:profiles!author_id(full_name)")
        .eq("id", id)
        .single();

      if (bErr) throw bErr;
      setBook(b as any);

      const { data: s, error: sErr } = await supabase
        .from("sales")
        .select("*")
        .eq("book_id", id)
        .maybeSingle();

      if (sErr) throw sErr;
      if (s) {
        setSalesRecord(s);
        setAmazonSales(s.amazon_sales ?? 0);
        setWebsiteSales(s.website_sales ?? 0);
      }
    } catch (err: any) {
      console.error("Failed to load book sales detail:", err);
      toast.error("Could not load book sales data.");
    } finally {
      setLoading(false);
    }
  }, [supabase, toast]);

  useEffect(() => {
    if (bookId) {
      loadData(bookId);
    }
  }, [bookId, loadData]);

  const handleSaveAndSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookId) return;
    setSaving(true);

    const total = amazonSales + websiteSales;

    // Estimate revenues if they don't exist
    const pricePerBook = 399; // INR
    const estimatedTotalRevenue = total * pricePerBook;
    const estimatedMonthlyRevenue = total * pricePerBook;

    const upsertData: any = {
      book_id: bookId,
      amazon_sales: amazonSales,
      website_sales: websiteSales,
      copies_sold: total,
      total_revenue: salesRecord?.total_revenue ?? estimatedTotalRevenue,
      monthly_revenue: salesRecord?.monthly_revenue ?? estimatedMonthlyRevenue,
      updated_at: new Date().toISOString(),
    };

    if (salesRecord?.id) {
      upsertData.id = salesRecord.id;
    }

    try {
      const { error } = await supabase.from("sales").upsert(upsertData);
      if (error) throw error;

      toast.success("Sales figures saved and synced successfully!");
      // Reload updated details
      loadData(bookId);
    } catch (err: any) {
      console.error("Failed to save sales data:", err);
      toast.error(err.message || "Failed to save sales data.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !profile || !book) {
    return (
      <div className="min-h-screen bg-[#030303] text-zinc-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  const totalCopiesSold = amazonSales + websiteSales;

  return (
    <DashboardShell nav={ADMIN_NAV} profile={profile} brand="Author Dashboard" title="Book Details">
      <div className="space-y-6 max-w-md mx-auto w-full">
        {/* Back Link */}
        <Link
          href="/admin/books"
          className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-white uppercase tracking-wider font-bold"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Books
        </Link>

        {/* Book Header info */}
        <div className="space-y-1 pb-4 border-b border-white/5">
          <span className="font-mono text-[9px] font-bold text-amber-400 border border-amber-500/20 bg-amber-500/5 px-2 py-0.5 rounded-md">
            {book.serial_number}
          </span>
          <h2 className="text-xl font-bold text-white font-serif tracking-tight mt-2">{book.title}</h2>
          <p className="text-xs text-zinc-500">
            Author: <span className="text-zinc-300 font-semibold">{book.author?.full_name ?? "Unassigned"}</span>
          </p>
        </div>

        {/* Edit Panel */}
        <form onSubmit={handleSaveAndSync} className="space-y-6 pt-2">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white font-serif">Editable Sales Stats</h3>
            <p className="text-[10px] text-zinc-500">Update copies sold across sales channels.</p>
          </div>

          {/* Amazon Sales */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Amazon Books Sold</label>
            <div className="relative">
              <ShoppingBag className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="number"
                min={0}
                required
                value={amazonSales}
                onChange={(e) => setAmazonSales(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full rounded-2xl border border-white/10 bg-black/40 py-3.5 pl-11 pr-4 text-xs text-white focus:outline-none focus:border-amber-500/30 transition-all font-semibold font-mono"
                placeholder="0"
              />
            </div>
          </div>

          {/* Website Sales */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Website Books Sold</label>
            <div className="relative">
              <BookOpen className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="number"
                min={0}
                required
                value={websiteSales}
                onChange={(e) => setWebsiteSales(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full rounded-2xl border border-white/10 bg-black/40 py-3.5 pl-11 pr-4 text-xs text-white focus:outline-none focus:border-amber-500/30 transition-all font-semibold font-mono"
                placeholder="0"
              />
            </div>
          </div>

          {/* Auto-calculated Total copies sold */}
          <div className="flex justify-between items-center p-4 rounded-2xl border border-amber-500/10 bg-amber-500/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-12 h-12 bg-amber-500/5 rounded-full blur-[20px]" />
            <div>
              <p className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">Total Copies Sold</p>
              <p className="text-[9px] text-zinc-500 mt-0.5">Calculated dynamically</p>
            </div>
            <span className="text-xl font-black text-amber-500 font-mono">{totalCopiesSold}</span>
          </div>

          {/* Save & Sync Button */}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-2xl bg-white hover:bg-zinc-200 py-3.5 text-xs font-bold text-black uppercase tracking-wider transition disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Syncing data…
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> Save & Sync
              </>
            )}
          </button>
        </form>
      </div>
    </DashboardShell>
  );
}
