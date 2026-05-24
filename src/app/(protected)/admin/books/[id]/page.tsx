"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { GlassCard } from "@/components/ui/glass-card";
import { ADMIN_NAV } from "@/lib/constants";
import type { Profile, Book, Sales } from "@/lib/types/database";
import { Loader2, Save, ArrowLeft, ShoppingBag, Globe, BarChart3 } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/toast";
import { useRouter, useParams } from "next/navigation";

type BookWithDetails = Book & {
  author?: Profile;
  sales?: Sales[];
};

export default function AdminBookDetailsPage() {
  const params = useParams();
  const id = params.id as string;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [book, setBook] = useState<BookWithDetails | null>(null);
  const [salesRecord, setSalesRecord] = useState<Sales | null>(null);

  // Stats form state
  const [amazonSales, setAmazonSales] = useState(0);
  const [websiteSales, setWebsiteSales] = useState(0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const supabase = createClient();
  const toast = useToast();
  const router = useRouter();

  const loadData = useCallback(async () => {
    try {
      // Get admin user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(p as Profile);

      // Get book details
      const { data: b, error: bErr } = await supabase
        .from("books")
        .select("*, author:profiles(*)")
        .eq("id", id)
        .single();

      if (bErr) throw bErr;
      setBook(b as BookWithDetails);

      // Get sales details
      const { data: s, error: sErr } = await supabase
        .from("sales")
        .select("*")
        .eq("book_id", id)
        .maybeSingle();

      if (s) {
        setSalesRecord(s as Sales);
        setAmazonSales(s.amazon_sales ?? 0);
        setWebsiteSales(s.website_sales ?? 0);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load book data.");
    } finally {
      setLoading(false);
    }
  }, [id, supabase, router, toast]);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id, loadData]);

  // Save & Sync handler
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!book) return;
    setSaving(true);

    const totalSold = Number(amazonSales) + Number(websiteSales);

    try {
      const payload = {
        book_id: book.id,
        amazon_sales: Number(amazonSales),
        website_sales: Number(websiteSales),
        copies_sold: totalSold,
        updated_by: profile?.id || null,
        updated_at: new Date().toISOString(),
      };

      if (salesRecord?.id) {
        // Update existing record
        const { error } = await supabase
          .from("sales")
          .update(payload)
          .eq("id", salesRecord.id);
        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from("sales")
          .insert(payload);
        if (error) throw error;
      }

      // Log activity
      await supabase.from("activity_logs").insert({
        book_id: book.id,
        user_id: profile?.id || null,
        action: "book_sales_updated",
        entity_type: "book",
        metadata: { title: book.title, amazon_sales: amazonSales, website_sales: websiteSales, total_sold: totalSold },
      });

      toast.success("Sales data synced to author dashboard successfully!");
      // Reload details
      loadData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to sync sales data.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-[#030303] text-zinc-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (!book) {
    return (
      <DashboardShell nav={ADMIN_NAV} profile={profile} brand="Author Dashboard" title="Book Details">
        <div className="text-center py-20 text-zinc-500">
          <p className="text-base font-semibold">Book not found.</p>
          <Link href="/admin/books" className="text-violet-400 hover:text-violet-300 mt-4 inline-block text-sm">
            Back to Catalog
          </Link>
        </div>
      </DashboardShell>
    );
  }

  const calculatedTotal = Number(amazonSales) + Number(websiteSales);

  return (
    <DashboardShell
      nav={ADMIN_NAV}
      profile={profile}
      brand="Author Dashboard"
      title="Book Details"
      subtitle="Edit sales metrics and sync instantly"
    >
      <div className="space-y-6 max-w-xl mx-auto">
        {/* Back Link */}
        <Link href="/admin/books" className="inline-flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-white uppercase tracking-wider transition-all">
          <ArrowLeft className="h-4 w-4" /> Back to Books
        </Link>

        {/* Book Header Card */}
        <GlassCard className="p-6 flex flex-col gap-2" hover={false} glow>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] font-bold text-violet-400 border border-violet-500/20 bg-violet-500/5 px-2 py-0.5 rounded-md">
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
          <h2 className="text-xl font-bold text-white font-serif tracking-tight leading-snug">
            {book.title}
          </h2>
          {book.subtitle && <p className="text-xs text-zinc-500">{book.subtitle}</p>}
          <p className="text-xs text-zinc-400">
            Author: <span className="text-violet-300 font-semibold">{book.author?.full_name ?? "Unknown Author"}</span>
          </p>
        </GlassCard>

        {/* Sales Stats Panel */}
        <form onSubmit={handleSave} className="space-y-5">
          <GlassCard className="p-6 space-y-6" hover={false}>
            <div className="flex items-center gap-2 text-violet-400 font-semibold">
              <BarChart3 className="h-5 w-5" />
              <h3>Editable Sales Statistics</h3>
            </div>

            {/* Amazon Sales Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                <ShoppingBag className="h-3 w-3 text-zinc-500" /> Amazon Books Sold
              </label>
              <input
                required
                type="number"
                min="0"
                placeholder="0"
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3.5 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-violet-500/30 transition-all font-semibold font-mono"
                value={amazonSales}
                onChange={(e) => setAmazonSales(Math.max(0, parseInt(e.target.value) || 0))}
              />
            </div>

            {/* Website Sales Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                <Globe className="h-3 w-3 text-zinc-500" /> Website Books Sold
              </label>
              <input
                required
                type="number"
                min="0"
                placeholder="0"
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3.5 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-violet-500/30 transition-all font-semibold font-mono"
                value={websiteSales}
                onChange={(e) => setWebsiteSales(Math.max(0, parseInt(e.target.value) || 0))}
              />
            </div>

            {/* Calculated Total (Read Only) */}
            <div className="p-4 rounded-2xl border border-violet-500/10 bg-violet-500/5 relative overflow-hidden flex justify-between items-center">
              <div className="absolute top-0 right-0 w-12 h-12 bg-violet-500/5 rounded-full blur-[20px] pointer-events-none" />
              <div>
                <p className="text-xs text-violet-400 font-bold uppercase tracking-wider">Total Copies Sold</p>
                <p className="text-[9px] text-zinc-500 mt-0.5">Automatically calculated: Amazon + Website</p>
              </div>
              <span className="text-xl font-black text-violet-400 font-mono">{calculatedTotal}</span>
            </div>
          </GlassCard>

          {/* Sync Button */}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-2xl bg-white hover:bg-zinc-200 py-4 text-xs font-bold text-black uppercase tracking-wider transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Syncing stats...
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
