"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { GlassCard } from "@/components/ui/glass-card";
import { ADMIN_NAV } from "@/lib/constants";
import type { Profile, Book, Sales } from "@/lib/types/database";
import { Loader2, Save, ArrowLeft, ShoppingBag, Globe, BarChart3, X, Trash2 } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/toast";
import { useRouter, useParams } from "next/navigation";
import { useRealtimeTable } from "@/hooks/use-realtime";
import { motion, AnimatePresence } from "framer-motion";

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
  const [amazonSalesMonthly, setAmazonSalesMonthly] = useState<Record<string, number>>({});
  const [websiteSalesMonthly, setWebsiteSalesMonthly] = useState<Record<string, number>>({});

  // Modal states for breakdown editor
  const [breakdownType, setBreakdownType] = useState<"amazon" | "website" | null>(null);
  const [newMonthRange, setNewMonthRange] = useState("");
  const [newMonthSales, setNewMonthSales] = useState(0);
  const [editingKey, setEditingKey] = useState<string | null>(null);

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
        setAmazonSalesMonthly((s as any).amazon_sales_monthly ?? {});
        setWebsiteSalesMonthly((s as any).website_sales_monthly ?? {});
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

  // Realtime subscription
  useRealtimeTable("sales", null, loadData);
  useRealtimeTable("books", null, loadData);

  const handleAddMonthEntry = () => {
    if (!newMonthRange.trim()) return;
    const target = breakdownType === "amazon" ? amazonSalesMonthly : websiteSalesMonthly;
    const setter = breakdownType === "amazon" ? setAmazonSalesMonthly : setWebsiteSalesMonthly;
    
    const updated = { ...target, [newMonthRange.trim()]: Number(newMonthSales) };
    setter(updated);
    
    // Recalculate totals
    const sum = Object.values(updated).reduce((a, b) => a + b, 0);
    if (breakdownType === "amazon") {
      setAmazonSales(sum);
    } else {
      setWebsiteSales(sum);
    }
    
    // Reset form
    setNewMonthRange("");
    setNewMonthSales(0);
    setEditingKey(null);
  };

  const handleEditMonthEntry = (key: string) => {
    setNewMonthRange(key);
    const target = breakdownType === "amazon" ? amazonSalesMonthly : websiteSalesMonthly;
    setNewMonthSales(target[key] ?? 0);
    setEditingKey(key);
  };

  const handleSaveEditedEntry = () => {
    if (!newMonthRange.trim() || !editingKey) return;
    const target = breakdownType === "amazon" ? amazonSalesMonthly : websiteSalesMonthly;
    const setter = breakdownType === "amazon" ? setAmazonSalesMonthly : setWebsiteSalesMonthly;
    
    const updated = { ...target };
    if (editingKey !== newMonthRange.trim()) {
      delete updated[editingKey];
    }
    updated[newMonthRange.trim()] = Number(newMonthSales);
    setter(updated);
    
    // Recalculate totals
    const sum = Object.values(updated).reduce((a, b) => a + b, 0);
    if (breakdownType === "amazon") {
      setAmazonSales(sum);
    } else {
      setWebsiteSales(sum);
    }
    
    // Reset form
    setNewMonthRange("");
    setNewMonthSales(0);
    setEditingKey(null);
  };

  const handleDeleteMonthEntry = (key: string) => {
    const target = breakdownType === "amazon" ? amazonSalesMonthly : websiteSalesMonthly;
    const setter = breakdownType === "amazon" ? setAmazonSalesMonthly : setWebsiteSalesMonthly;
    
    const updated = { ...target };
    delete updated[key];
    setter(updated);
    
    // Recalculate totals
    const sum = Object.values(updated).reduce((a, b) => a + b, 0);
    if (breakdownType === "amazon") {
      setAmazonSales(sum);
    } else {
      setWebsiteSales(sum);
    }
  };

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
        amazon_sales_monthly: amazonSalesMonthly,
        website_sales_monthly: websiteSalesMonthly,
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
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!book) {
    return (
      <DashboardShell nav={ADMIN_NAV} profile={profile} brand="Author Dashboard" title="Book Details">
        <div className="text-center py-20 text-zinc-500">
          <p className="text-base font-semibold">Book not found.</p>
          <Link href="/admin/books" className="text-amber-500 hover:text-amber-400 mt-4 inline-block text-sm">
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
            <span className="font-mono text-[9px] font-bold text-amber-400 border border-amber-500/20 bg-amber-500/5 px-2 py-0.5 rounded-md">
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
            Author: <span className="text-amber-500 font-semibold">{book.author?.full_name ?? "Unknown Author"}</span>
          </p>
        </GlassCard>

        {/* Sales Stats Panel */}
        <form onSubmit={handleSave} className="space-y-5">
          <GlassCard className="p-6 space-y-6" hover={false}>
            <div className="flex items-center gap-2 text-amber-500 font-semibold">
              <BarChart3 className="h-5 w-5" />
              <h3>Editable Sales Statistics</h3>
            </div>

            {/* Amazon Sales (Clickable Card) */}
            <div
              onClick={() => setBreakdownType("amazon")}
              className="p-4 rounded-2xl border border-white/5 bg-[#09090b]/80 hover:border-amber-500/20 hover:bg-[#0f0f13] cursor-pointer transition flex justify-between items-center group"
            >
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1 select-none">
                  <ShoppingBag className="h-3.5 w-3.5 text-zinc-500" /> Amazon Sold
                </label>
                <p className="text-[10px] text-zinc-500 select-none">Click to view/edit monthly breakdown</p>
              </div>
              <span className="text-lg font-extrabold text-white font-mono group-hover:text-amber-400 transition-colors">{amazonSales}</span>
            </div>

            {/* Website Sales (Clickable Card) */}
            <div
              onClick={() => setBreakdownType("website")}
              className="p-4 rounded-2xl border border-white/5 bg-[#09090b]/80 hover:border-amber-500/20 hover:bg-[#0f0f13] cursor-pointer transition flex justify-between items-center group"
            >
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1 select-none">
                  <Globe className="h-3.5 w-3.5 text-zinc-500" /> Website Sold
                </label>
                <p className="text-[10px] text-zinc-500 select-none">Click to view/edit monthly breakdown</p>
              </div>
              <span className="text-lg font-extrabold text-white font-mono group-hover:text-amber-400 transition-colors">{websiteSales}</span>
            </div>

            {/* Calculated Total (Read Only) */}
            <div className="p-4 rounded-2xl border border-amber-500/10 bg-amber-500/5 relative overflow-hidden flex justify-between items-center">
              <div className="absolute top-0 right-0 w-12 h-12 bg-amber-500/5 rounded-full blur-[20px] pointer-events-none" />
              <div>
                <p className="text-xs text-amber-500 font-bold uppercase tracking-wider">Total Copies Sold</p>
                <p className="text-[9px] text-zinc-500 mt-0.5">Automatically calculated: Amazon + Website</p>
              </div>
              <span className="text-xl font-black text-amber-500 font-mono">{calculatedTotal}</span>
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

      {/* ── SALES BREAKDOWN MODAL ────────────────────────────────────────── */}
      <AnimatePresence>
        {breakdownType && (() => {
          const title = breakdownType === "amazon" ? "Amazon Sales Breakdown" : "Website Sales Breakdown";
          const monthlyData = breakdownType === "amazon" ? amazonSalesMonthly : websiteSalesMonthly;
          const totalSales = breakdownType === "amazon" ? amazonSales : websiteSales;
          
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-[#09090b] p-6 shadow-2xl relative flex flex-col max-h-[85vh]"
              >
                {/* Accent Glow Top Border */}
                <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />

                <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4 shrink-0">
                  <div>
                    <h3 className="text-base font-bold text-white">{title}</h3>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Add, edit, or remove monthly sales entries.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setBreakdownType(null);
                      setNewMonthRange("");
                      setNewMonthSales(0);
                      setEditingKey(null);
                    }}
                    className="rounded-full bg-white/5 p-1.5 text-zinc-400 hover:text-white transition"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Entry List */}
                <div className="flex-grow overflow-y-auto space-y-2 pr-1 py-1">
                  {Object.keys(monthlyData).length === 0 ? (
                    <p className="text-xs text-zinc-550 italic text-center py-6">No monthly entries. Add one below.</p>
                  ) : (
                    Object.entries(monthlyData).map(([month, count]) => (
                      <div key={month} className="flex justify-between items-center p-3 rounded-2xl border border-white/5 bg-white/2">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white">{month}</p>
                          <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">{count} sales</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleEditMonthEntry(month)}
                            className="px-2.5 py-1 rounded-xl border border-white/10 bg-white/5 text-[10px] font-semibold text-zinc-300 hover:bg-white/10 transition"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMonthEntry(month)}
                            className="p-1.5 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/20 transition"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Add/Edit Form */}
                <div className="border-t border-white/5 pt-4 mt-4 space-y-3 shrink-0">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
                    {editingKey ? "Edit Month Entry" : "Add Month Entry"}
                  </h4>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="e.g. January-February"
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-amber-500/30 transition-all font-semibold"
                      value={newMonthRange}
                      onChange={(e) => setNewMonthRange(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="0"
                        placeholder="Sales count"
                        className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-amber-500/30 transition-all font-semibold font-mono"
                        value={newMonthSales || ""}
                        onChange={(e) => setNewMonthSales(Math.max(0, parseInt(e.target.value) || 0))}
                      />
                      <button
                        type="button"
                        onClick={editingKey ? handleSaveEditedEntry : handleAddMonthEntry}
                        className="rounded-xl bg-white hover:bg-zinc-200 px-4 py-2.5 text-xs font-bold text-black transition"
                      >
                        {editingKey ? "Save" : "Add"}
                      </button>
                    </div>
                  </div>
                  {editingKey && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingKey(null);
                        setNewMonthRange("");
                        setNewMonthSales(0);
                      }}
                      className="w-full text-center text-[10px] text-zinc-500 hover:text-white"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                <div className="border-t border-white/5 pt-3 mt-4 flex justify-between items-center text-[10px] font-bold text-amber-500 shrink-0">
                  <span>Total Sales</span>
                  <span className="font-mono text-xs">{totalSales}</span>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </DashboardShell>
  );
}
