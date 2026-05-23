"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { GlassCard } from "@/components/ui/glass-card";
import { createClient } from "@/lib/supabase/client";
import { ADMIN_NAV } from "@/lib/constants";
import { formatCurrency, cn } from "@/lib/utils";
import type { Profile, WithdrawalRequest, AuthorRoyalties, RoyaltyTransaction } from "@/lib/types/database";
import { useRealtimeTable } from "@/hooks/use-realtime";
import {
  Wallet,
  TrendingUp,
  Users,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  CreditCard,
  Plus,
  ChevronDown,
  X,
  Search,
  RefreshCw,
  AlertTriangle,
  BadgeCheck,
  ArrowUpRight,
  Banknote,
  Receipt,
} from "lucide-react";

type AuthorRoyaltiesWithProfile = AuthorRoyalties & {
  author?: Profile;
};

type WithdrawalWithProfile = WithdrawalRequest & {
  author?: Profile;
};

const STATUS_CONFIG = {
  pending: { label: "Pending", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", icon: Clock },
  approved: { label: "Approved", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", icon: CheckCircle },
  rejected: { label: "Rejected", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", icon: XCircle },
  paid: { label: "Paid", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", icon: BadgeCheck },
};

export default function AdminRoyaltiesPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [royalties, setRoyalties] = useState<AuthorRoyaltiesWithProfile[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalWithProfile[]>([]);
  const [transactions, setTransactions] = useState<(RoyaltyTransaction & { book?: { title: string } })[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "withdrawals" | "ledger" | "credit">("overview");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Credit modal
  const [creditOpen, setCreditOpen] = useState(false);
  const [selectedAuthorId, setSelectedAuthorId] = useState("");
  const [creditAmount, setCreditAmount] = useState("");
  const [creditDesc, setCreditDesc] = useState("");
  const [creditBookId, setCreditBookId] = useState("");
  const [crediting, setCrediting] = useState(false);

  // UTR modal
  const [utrModal, setUtrModal] = useState<{ id: string; amount: number; authorName: string } | null>(null);
  const [utrInput, setUtrInput] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  const supabase = createClient();

  const load = useCallback(async () => {
    const [wRes, rRes, tRes] = await Promise.all([
      supabase
        .from("withdrawal_requests")
        .select("*, author:profiles!withdrawal_requests_author_id_fkey(id, full_name, email, avatar_url, bank_account_name, bank_account_number, bank_ifsc, bank_upi)")
        .order("created_at", { ascending: false }),
      supabase
        .from("author_royalties")
        .select("*, author:profiles!author_royalties_author_id_fkey(id, full_name, email, avatar_url)")
        .order("lifetime_earnings", { ascending: false }),
      supabase
        .from("royalty_transactions")
        .select("*, book:books(id, title)")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    setWithdrawals((wRes.data as WithdrawalWithProfile[]) ?? []);
    setRoyalties((rRes.data as AuthorRoyaltiesWithProfile[]) ?? []);
    setTransactions(tRes.data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user)
        supabase.from("profiles").select("*").eq("id", data.user.id).single().then(({ data }) => setProfile(data as Profile));
    });
    load();
  }, [supabase, load]);

  useRealtimeTable("withdrawal_requests", null, load);
  useRealtimeTable("author_royalties", null, load);

  async function processWithdrawal(id: string, action: "approve" | "reject" | "paid") {
    setProcessing(true);
    await fetch("/api/admin/withdrawals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action, utr: utrInput || undefined, admin_notes: adminNotes || undefined }),
    });
    setProcessing(false);
    setUtrModal(null);
    setUtrInput("");
    setAdminNotes("");
    load();
  }

  async function submitCredit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAuthorId || !creditAmount || !creditDesc) return;
    setCrediting(true);
    await fetch("/api/admin/royalties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        author_id: selectedAuthorId,
        amount: Number(creditAmount),
        description: creditDesc,
        tx_type: "credit",
        book_id: creditBookId || undefined,
      }),
    });
    setCrediting(false);
    setCreditOpen(false);
    setSelectedAuthorId("");
    setCreditAmount("");
    setCreditDesc("");
    setCreditBookId("");
    load();
  }

  // Aggregated stats
  const totalPlatformEarnings = royalties.reduce((s, r) => s + Number(r.lifetime_earnings), 0);
  const totalAvailable = royalties.reduce((s, r) => s + Number(r.available_balance), 0);
  const totalWithdrawn = royalties.reduce((s, r) => s + Number(r.total_withdrawn ?? 0), 0);
  const pendingWithdrawals = withdrawals.filter((w) => w.status === "pending");
  const pendingTotal = pendingWithdrawals.reduce((s, w) => s + Number(w.amount), 0);

  const filteredWithdrawals = withdrawals.filter((w) => {
    const matchStatus = filterStatus === "all" || w.status === filterStatus;
    const matchSearch = !search || w.author?.full_name?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  if (!profile) return null;

  const tabs = [
    { key: "overview", label: "Overview", icon: TrendingUp },
    { key: "withdrawals", label: `Withdrawals${pendingWithdrawals.length > 0 ? ` (${pendingWithdrawals.length})` : ""}`, icon: Banknote },
    { key: "ledger", label: "Ledger", icon: Receipt },
    { key: "credit", label: "Credit Royalty", icon: Plus },
  ] as const;

  return (
    <DashboardShell
      nav={ADMIN_NAV}
      profile={profile}
      brand="Author Dashboard"
      title="Royalty Management"
      subtitle="Enterprise payout control center"
    >
      <div className="space-y-8">
        {/* ── KPI Strip ────────────────────────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Platform Earnings", value: formatCurrency(totalPlatformEarnings), icon: TrendingUp, color: "from-violet-600/20 to-purple-600/10", iconColor: "text-violet-400", glow: "shadow-violet-900/20" },
            { label: "Available Balance", value: formatCurrency(totalAvailable), icon: Wallet, color: "from-emerald-600/20 to-teal-600/10", iconColor: "text-emerald-400", glow: "shadow-emerald-900/20" },
            { label: "Total Withdrawn", value: formatCurrency(totalWithdrawn), icon: CreditCard, color: "from-blue-600/20 to-cyan-600/10", iconColor: "text-blue-400", glow: "shadow-blue-900/20" },
            { label: "Pending Requests", value: `${pendingWithdrawals.length} · ${formatCurrency(pendingTotal)}`, icon: AlertTriangle, color: "from-amber-600/20 to-orange-600/10", iconColor: "text-amber-400", glow: "shadow-amber-900/20" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <GlassCard className={cn("p-6 bg-gradient-to-br shadow-xl", stat.color, stat.glow)} hover={false}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">{stat.label}</p>
                    <p className="mt-2 text-2xl font-bold text-white leading-none">{stat.value}</p>
                  </div>
                  <div className={cn("rounded-2xl bg-white/5 p-3", stat.iconColor)}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        {/* ── Tab Navigation ───────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2 border-b border-white/6 pb-4">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={cn(
                "flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition",
                activeTab === t.key
                  ? "bg-violet-500/20 text-violet-200"
                  : "text-zinc-500 hover:bg-white/5 hover:text-white"
              )}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
          <button
            onClick={load}
            className="ml-auto flex items-center gap-1.5 rounded-xl border border-white/8 bg-white/4 px-3 py-2 text-xs text-zinc-400 hover:text-white transition"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {/* ── Overview Tab ─────────────────────────────────────────── */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-violet-400" /> Author Wallet Overview
                </h3>
                {loading ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 rounded-3xl bg-white/4 animate-pulse" />)}
                  </div>
                ) : royalties.length === 0 ? (
                  <GlassCard className="py-20 text-center" hover={false}>
                    <Wallet className="mx-auto h-12 w-12 text-zinc-700 mb-4" />
                    <p className="text-zinc-400 font-medium">No royalty records yet</p>
                    <p className="text-zinc-600 text-sm mt-1">Credit royalties to authors to get started</p>
                  </GlassCard>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {royalties.map((r, i) => (
                      <motion.div key={r.author_id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                        <GlassCard className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-300 font-bold text-sm">
                                {r.author?.full_name?.charAt(0) ?? "?"}
                              </div>
                              <div>
                                <p className="font-semibold text-white text-sm">{r.author?.full_name ?? "Unknown"}</p>
                                <p className="text-xs text-zinc-500">{r.author?.email}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => { setSelectedAuthorId(r.author_id); setCreditOpen(true); }}
                              className="flex items-center gap-1 rounded-xl bg-violet-600/20 px-3 py-1.5 text-xs font-semibold text-violet-300 hover:bg-violet-600/40 transition"
                            >
                              <Plus className="h-3 w-3" /> Credit
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="rounded-2xl bg-white/4 p-3">
                              <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Available</p>
                              <p className="text-lg font-bold text-emerald-400 mt-1">{formatCurrency(Number(r.available_balance))}</p>
                            </div>
                            <div className="rounded-2xl bg-white/4 p-3">
                              <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Pending</p>
                              <p className="text-lg font-bold text-amber-400 mt-1">{formatCurrency(Number(r.pending_balance))}</p>
                            </div>
                            <div className="rounded-2xl bg-white/4 p-3">
                              <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Lifetime</p>
                              <p className="text-lg font-bold text-white mt-1">{formatCurrency(Number(r.lifetime_earnings))}</p>
                            </div>
                          </div>
                        </GlassCard>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Withdrawals Tab ───────────────────────────────────────── */}
            {activeTab === "withdrawals" && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 min-w-52">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search author..."
                      className="w-full rounded-2xl border border-white/10 bg-white/4 pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-600"
                    />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {["all", "pending", "approved", "paid", "rejected"].map((s) => (
                      <button
                        key={s}
                        onClick={() => setFilterStatus(s)}
                        className={cn(
                          "rounded-xl px-3.5 py-1.5 text-xs font-medium capitalize transition",
                          filterStatus === s ? "bg-violet-500/20 text-violet-200" : "bg-white/4 text-zinc-400 hover:text-white"
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredWithdrawals.length === 0 ? (
                  <GlassCard className="py-16 text-center" hover={false}>
                    <Banknote className="mx-auto h-12 w-12 text-zinc-700 mb-4" />
                    <p className="text-zinc-400">No withdrawal requests found</p>
                  </GlassCard>
                ) : (
                  <div className="space-y-4">
                    {filteredWithdrawals.map((w, i) => {
                      const cfg = STATUS_CONFIG[w.status] ?? STATUS_CONFIG.pending;
                      const Icon = cfg.icon;
                      return (
                        <motion.div key={w.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                          <GlassCard className="p-6" hover={false}>
                            <div className="flex flex-wrap items-start justify-between gap-4">
                              <div className="flex items-start gap-4">
                                <div className="h-12 w-12 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-300 font-bold shrink-0">
                                  {w.author?.full_name?.charAt(0) ?? "?"}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-semibold text-white">{w.author?.full_name ?? "Unknown"}</p>
                                    <span className={cn("flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase", cfg.bg, cfg.color)}>
                                      <Icon className="h-2.5 w-2.5" /> {cfg.label}
                                    </span>
                                  </div>
                                  <p className="text-xs text-zinc-500 mt-0.5">{w.author?.email} · {new Date(w.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                                  <p className="text-3xl font-bold text-emerald-400 mt-2">{formatCurrency(Number(w.amount))}</p>
                                  {w.utr && <p className="text-xs text-zinc-500 mt-1">UTR: <span className="text-zinc-300 font-mono">{w.utr}</span></p>}
                                  {w.admin_notes && <p className="text-xs text-zinc-500 mt-1">Note: {w.admin_notes}</p>}
                                </div>
                              </div>
                              <div className="space-y-2">
                                {/* Bank details */}
                                <div className="rounded-xl bg-white/4 border border-white/8 px-4 py-3 text-xs space-y-1 font-mono min-w-48">
                                  {Object.entries(w.bank_snapshot ?? {}).map(([k, v]) => (
                                    <div key={k} className="flex justify-between gap-4">
                                      <span className="text-zinc-500 capitalize">{k.replace(/_/g, " ")}</span>
                                      <span className="text-zinc-300">{v}</span>
                                    </div>
                                  ))}
                                </div>
                                {w.status === "pending" && (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => processWithdrawal(w.id, "approve")}
                                      className="flex-1 rounded-xl bg-blue-500/15 border border-blue-500/20 px-3 py-2 text-xs font-semibold text-blue-400 hover:bg-blue-500/25 transition"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => setUtrModal({ id: w.id, amount: w.amount, authorName: w.author?.full_name ?? "" })}
                                      className="flex-1 rounded-xl bg-emerald-500/15 border border-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/25 transition"
                                    >
                                      Mark Paid
                                    </button>
                                    <button
                                      onClick={() => processWithdrawal(w.id, "reject")}
                                      className="rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                )}
                                {w.status === "approved" && (
                                  <button
                                    onClick={() => setUtrModal({ id: w.id, amount: w.amount, authorName: w.author?.full_name ?? "" })}
                                    className="w-full rounded-xl bg-emerald-500/15 border border-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/25 transition flex items-center justify-center gap-1"
                                  >
                                    <BadgeCheck className="h-3.5 w-3.5" /> Mark as Paid
                                  </button>
                                )}
                              </div>
                            </div>
                          </GlassCard>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Ledger Tab ────────────────────────────────────────────── */}
            {activeTab === "ledger" && (
              <div className="space-y-4">
                <GlassCard hover={false}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/6 text-left">
                          <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">Author</th>
                          <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">Book</th>
                          <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">Type</th>
                          <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">Description</th>
                          <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-zinc-500 text-right">Amount</th>
                          <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-16 text-center text-zinc-500">No transactions yet</td>
                          </tr>
                        ) : (
                          transactions.map((t, i) => (
                            <motion.tr
                              key={t.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: i * 0.02 }}
                              className="border-b border-white/4 hover:bg-white/2 transition"
                            >
                              <td className="px-6 py-4 text-zinc-300">{t.author_id.slice(0, 8)}…</td>
                              <td className="px-6 py-4 text-zinc-400">{t.book?.title ?? "—"}</td>
                              <td className="px-6 py-4">
                                <span className={cn(
                                  "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase border",
                                  t.tx_type === "credit" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                                  t.tx_type === "payout" ? "bg-red-500/10 border-red-500/20 text-red-400" :
                                  "bg-zinc-500/10 border-zinc-500/20 text-zinc-400"
                                )}>
                                  {t.tx_type}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-zinc-400 max-w-xs truncate">{t.description ?? "—"}</td>
                              <td className={cn("px-6 py-4 text-right font-bold font-mono", Number(t.amount) >= 0 ? "text-emerald-400" : "text-red-400")}>
                                {Number(t.amount) >= 0 ? "+" : ""}{formatCurrency(Math.abs(Number(t.amount)))}
                              </td>
                              <td className="px-6 py-4 text-zinc-500 text-xs">{new Date(t.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
                            </motion.tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </GlassCard>
              </div>
            )}

            {/* ── Credit Tab ────────────────────────────────────────────── */}
            {activeTab === "credit" && (
              <div className="max-w-xl">
                <GlassCard className="p-8 space-y-6" hover={false}>
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-emerald-500/10 p-3">
                      <DollarSign className="h-6 w-6 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Credit Royalty</h3>
                      <p className="text-sm text-zinc-500">Add funds to an author's wallet</p>
                    </div>
                  </div>
                  <form onSubmit={submitCredit} className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Author</label>
                      <select
                        required
                        value={selectedAuthorId}
                        onChange={(e) => setSelectedAuthorId(e.target.value)}
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white text-sm"
                      >
                        <option value="">Select author…</option>
                        {royalties.map((r) => (
                          <option key={r.author_id} value={r.author_id}>
                            {r.author?.full_name ?? r.author_id}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Amount (₹)</label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={creditAmount}
                        onChange={(e) => setCreditAmount(e.target.value)}
                        placeholder="e.g. 5000"
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white text-sm placeholder-zinc-600"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Description</label>
                      <input
                        type="text"
                        required
                        value={creditDesc}
                        onChange={(e) => setCreditDesc(e.target.value)}
                        placeholder="e.g. Q1 2025 royalty payout for Book Title"
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white text-sm placeholder-zinc-600"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={crediting}
                      className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 py-3 font-semibold text-white hover:opacity-90 disabled:opacity-50 transition flex items-center justify-center gap-2"
                    >
                      {crediting ? (
                        <><RefreshCw className="h-4 w-4 animate-spin" /> Processing…</>
                      ) : (
                        <><ArrowUpRight className="h-4 w-4" /> Credit to Wallet</>
                      )}
                    </button>
                  </form>
                </GlassCard>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── UTR / Paid Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {utrModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
            onClick={() => setUtrModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-950 p-8 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">Mark as Paid</h3>
                  <p className="text-sm text-zinc-500 mt-1">{utrModal.authorName} · {formatCurrency(utrModal.amount)}</p>
                </div>
                <button onClick={() => setUtrModal(null)} className="rounded-full bg-white/5 p-1.5 text-zinc-400 hover:text-white"><X className="h-4 w-4" /></button>
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">UTR / Transaction ID</label>
                <input
                  value={utrInput}
                  onChange={(e) => setUtrInput(e.target.value)}
                  placeholder="Enter UTR number"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white text-sm placeholder-zinc-600"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Admin Notes (optional)</label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Any notes for the author..."
                  rows={3}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white text-sm placeholder-zinc-600 resize-none"
                />
              </div>
              <button
                onClick={() => processWithdrawal(utrModal.id, "paid")}
                disabled={processing}
                className="w-full rounded-2xl bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processing ? <><RefreshCw className="h-4 w-4 animate-spin" /> Processing…</> : <><BadgeCheck className="h-4 w-4" /> Confirm Payment</>}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Credit Modal (from Overview) ───────────────────────────────── */}
      <AnimatePresence>
        {creditOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
            onClick={() => setCreditOpen(false)}
          >
            <motion.form
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              onSubmit={submitCredit}
              className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-950 p-8 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Quick Credit</h3>
                <button type="button" onClick={() => setCreditOpen(false)} className="rounded-full bg-white/5 p-1.5 text-zinc-400 hover:text-white"><X className="h-4 w-4" /></button>
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Author</label>
                <select
                  required
                  value={selectedAuthorId}
                  onChange={(e) => setSelectedAuthorId(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white text-sm"
                >
                  <option value="">Select author…</option>
                  {royalties.map((r) => (
                    <option key={r.author_id} value={r.author_id}>{r.author?.full_name ?? r.author_id}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Amount (₹)</label>
                <input type="number" required min={1} value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} placeholder="e.g. 5000" className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white text-sm placeholder-zinc-600" />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Description</label>
                <input type="text" required value={creditDesc} onChange={(e) => setCreditDesc(e.target.value)} placeholder="e.g. Q1 2025 royalty for Book Title" className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white text-sm placeholder-zinc-600" />
              </div>
              <button type="submit" disabled={crediting} className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 py-3 font-semibold text-white hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                {crediting ? <><RefreshCw className="h-4 w-4 animate-spin" /> Crediting…</> : <><DollarSign className="h-4 w-4" /> Credit Royalty</>}
              </button>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardShell>
  );
}
