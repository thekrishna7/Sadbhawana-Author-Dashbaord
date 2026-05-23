"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { GlassCard } from "@/components/ui/glass-card";
import { createClient } from "@/lib/supabase/client";
import { AUTHOR_NAV } from "@/lib/constants";
import { formatCurrency, cn } from "@/lib/utils";
import type { Profile, RoyaltyTransaction, WithdrawalRequest } from "@/lib/types/database";
import { useRealtimeTable } from "@/hooks/use-realtime";
import { sendNotification } from "@/lib/notifications";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Wallet,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  ArrowDownToLine,
  BadgeCheck,
  X,
  RefreshCw,
  Banknote,
  AlertCircle,
  DollarSign,
  CalendarClock,
} from "lucide-react";

const STATUS_CONFIG = {
  pending: { label: "Pending", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", icon: Clock },
  approved: { label: "Approved", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", icon: CheckCircle },
  rejected: { label: "Rejected", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", icon: XCircle },
  paid: { label: "Paid", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", icon: BadgeCheck },
};

interface RoyaltyData {
  available_balance: number;
  pending_balance: number;
  lifetime_earnings: number;
  total_withdrawn: number | null;
  last_payout_at: string | null;
  next_payout_at: string | null;
}

export default function AuthorRoyaltiesPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [royalties, setRoyalties] = useState<RoyaltyData | null>(null);
  const [transactions, setTransactions] = useState<(RoyaltyTransaction & { book?: { title: string } })[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "history" | "payouts">("overview");

  const supabase = createClient();

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    setProfile(p as Profile);
    const { data: r } = await supabase.from("author_royalties").select("*").eq("author_id", user.id).single();
    setRoyalties(r);
    const { data: tx } = await supabase
      .from("royalty_transactions")
      .select("*, book:books(id, title)")
      .eq("author_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setTransactions(tx ?? []);
    const { data: wr } = await supabase
      .from("withdrawal_requests")
      .select("*")
      .eq("author_id", user.id)
      .order("created_at", { ascending: false });
    setWithdrawals(wr ?? []);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);
  useRealtimeTable("author_royalties", profile ? { column: "author_id", value: profile.id } : null, load);
  useRealtimeTable("withdrawal_requests", profile ? { column: "author_id", value: profile.id } : null, load);

  async function requestWithdrawal(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    const amt = Number(amount);
    if (amt <= 0 || amt > Number(royalties?.available_balance ?? 0)) return;
    if (!profile.bank_account_number) {
      alert("Please add your bank details in Profile settings first.");
      return;
    }
    setSubmitting(true);
    const { error: insertErr } = await supabase.from("withdrawal_requests").insert({
      author_id: profile.id,
      amount: amt,
      bank_snapshot: {
        account_name: profile.bank_account_name ?? "",
        account_number: profile.bank_account_number ?? "",
        ifsc: profile.bank_ifsc ?? "",
        upi: profile.bank_upi ?? "",
      },
    });
    if (!insertErr) {
      const { data: admins } = await supabase.from("profiles").select("id").eq("role", "super_admin");
      if (admins?.length) {
        await sendNotification({
          userIds: admins.map((a) => a.id),
          type: "warning",
          title: "New Royalty Withdrawal Request",
          body: `${profile.full_name ?? "Author"} has requested a royalty withdrawal of ₹${amt.toLocaleString("en-IN")}.`,
          link: "/admin/royalties",
        });
      }
    }
    setSubmitting(false);
    setWithdrawOpen(false);
    setAmount("");
    load();
  }

  // Build chart data from transactions (last 12 credit entries)
  const chartData = (() => {
    const credits = transactions
      .filter((t) => t.tx_type === "credit" && Number(t.amount) > 0)
      .slice(0, 12)
      .reverse();
    return credits.map((t) => ({
      date: new Date(t.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      amount: Number(t.amount),
    }));
  })();

  const totalWithdrawn = Number(royalties?.total_withdrawn ?? 0);
  const netBalance = Number(royalties?.available_balance ?? 0);
  const pendingWithdrawals = withdrawals.filter((w) => w.status === "pending" || w.status === "approved");

  if (!profile) return null;

  const tabs = [
    { key: "overview" as const, label: "Overview", icon: TrendingUp },
    { key: "history" as const, label: "Transaction History", icon: Banknote },
    { key: "payouts" as const, label: "My Requests", icon: ArrowDownToLine },
  ];

  return (
    <DashboardShell
      nav={AUTHOR_NAV}
      profile={profile}
      brand="Creator Workspace"
      title="Royalties"
      subtitle="Your earnings dashboard"
    >
      <div className="space-y-8">
        {/* ── Hero Stat Cards ───────────────────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Available Balance",
              value: formatCurrency(netBalance),
              subtext: "Ready to withdraw",
              icon: Wallet,
              gradient: "from-emerald-600/20 via-teal-600/10 to-transparent",
              iconBg: "bg-emerald-500/10 text-emerald-400",
              valueColor: "text-emerald-400",
              glow: true,
            },
            {
              label: "Pending Clearance",
              value: formatCurrency(Number(royalties?.pending_balance ?? 0)),
              subtext: "Under processing",
              icon: Clock,
              gradient: "from-amber-600/20 via-orange-600/10 to-transparent",
              iconBg: "bg-amber-500/10 text-amber-400",
              valueColor: "text-amber-400",
              glow: false,
            },
            {
              label: "Lifetime Earnings",
              value: formatCurrency(Number(royalties?.lifetime_earnings ?? 0)),
              subtext: "Total royalties earned",
              icon: TrendingUp,
              gradient: "from-violet-600/20 via-purple-600/10 to-transparent",
              iconBg: "bg-violet-500/10 text-violet-400",
              valueColor: "text-white",
              glow: false,
            },
            {
              label: "Total Withdrawn",
              value: formatCurrency(totalWithdrawn),
              subtext: "Successfully paid out",
              icon: DollarSign,
              gradient: "from-blue-600/20 via-cyan-600/10 to-transparent",
              iconBg: "bg-blue-500/10 text-blue-400",
              valueColor: "text-blue-400",
              glow: false,
            },
          ].map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
            >
              <GlassCard
                glow={card.glow}
                className={cn("p-6 bg-gradient-to-br", card.gradient)}
                hover={false}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">{card.label}</p>
                    <p className={cn("mt-2 text-3xl font-bold leading-none", card.valueColor)}>{card.value}</p>
                    <p className="mt-1.5 text-xs text-zinc-600">{card.subtext}</p>
                  </div>
                  <div className={cn("rounded-2xl p-3", card.iconBg)}>
                    <card.icon className="h-5 w-5" />
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        {/* ── Withdraw CTA Banner ──────────────────────────────────────── */}
        {netBalance > 0 && pendingWithdrawals.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <div className="relative overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-r from-violet-600/10 via-purple-600/5 to-transparent p-6 flex items-center justify-between gap-6">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-600/5 to-transparent pointer-events-none" />
              <div>
                <p className="font-semibold text-white text-lg">Ready to withdraw?</p>
                <p className="text-sm text-zinc-400 mt-1">You have <span className="text-emerald-400 font-bold">{formatCurrency(netBalance)}</span> available for withdrawal.</p>
              </div>
              <button
                onClick={() => setWithdrawOpen(true)}
                className="shrink-0 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-3 font-semibold text-white hover:opacity-90 transition shadow-lg shadow-violet-900/30 flex items-center gap-2"
              >
                <ArrowDownToLine className="h-4 w-4" /> Request Withdrawal
              </button>
            </div>
          </motion.div>
        )}

        {pendingWithdrawals.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-5 py-3.5">
              <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
              <p className="text-sm text-amber-300">
                You have {pendingWithdrawals.length} pending withdrawal request{pendingWithdrawals.length > 1 ? "s" : ""} under review.
              </p>
            </div>
          </motion.div>
        )}

        {/* ── Tabs ─────────────────────────────────────────────────────── */}
        <div className="flex gap-2 border-b border-white/6 pb-4">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={cn(
                "flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition",
                activeTab === t.key ? "bg-violet-500/20 text-violet-200" : "text-zinc-500 hover:bg-white/5 hover:text-white"
              )}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {/* ── Overview ─────────────────────────────────────────────── */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Earnings Chart */}
                <GlassCard className="p-8" hover={false} glow>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-white">Royalty Credits</h3>
                      <p className="text-xs text-zinc-500 mt-0.5">Recent credit history</p>
                    </div>
                    {royalties?.last_payout_at && (
                      <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                        <CalendarClock className="h-3.5 w-3.5" />
                        Last payout: {new Date(royalties.last_payout_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </div>
                    )}
                  </div>
                  {chartData.length === 0 ? (
                    <div className="h-48 flex items-center justify-center text-zinc-600">
                      <div className="text-center">
                        <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">No credit history yet</p>
                      </div>
                    </div>
                  ) : (
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                          <defs>
                            <linearGradient id="royaltyGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                          <XAxis dataKey="date" stroke="#52525b" tick={{ fontSize: 11 }} />
                          <YAxis stroke="#52525b" tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                          <Tooltip
                            contentStyle={{ background: "#09090b", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, fontSize: 12 }}
                            formatter={(value) => [formatCurrency(Number(value)), "Credited"]}
                          />
                          <Area
                            type="monotone"
                            dataKey="amount"
                            stroke="#8b5cf6"
                            strokeWidth={2.5}
                            fill="url(#royaltyGradient)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </GlassCard>

                {/* Next payout info */}
                {royalties?.next_payout_at && (
                  <GlassCard className="p-6" hover={false}>
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-blue-500/10 p-3">
                        <CalendarClock className="h-5 w-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">Next scheduled payout</p>
                        <p className="text-2xl font-bold text-blue-400 mt-1">
                          {new Date(royalties.next_payout_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                  </GlassCard>
                )}
              </div>
            )}

            {/* ── Transaction History ───────────────────────────────────── */}
            {activeTab === "history" && (
              <GlassCard hover={false}>
                {transactions.length === 0 ? (
                  <div className="py-20 text-center">
                    <Banknote className="mx-auto h-12 w-12 text-zinc-700 mb-4" />
                    <p className="text-zinc-400 font-medium">No transactions yet</p>
                    <p className="text-zinc-600 text-sm mt-1">Royalty credits will appear here</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/6">
                          <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-widest text-zinc-500">Date</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-widest text-zinc-500">Book</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-widest text-zinc-500">Type</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-widest text-zinc-500">Description</th>
                          <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-widest text-zinc-500">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((t, i) => (
                          <motion.tr
                            key={t.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.025 }}
                            className="border-b border-white/4 hover:bg-white/2 transition"
                          >
                            <td className="px-6 py-4 text-xs text-zinc-500">
                              {new Date(t.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </td>
                            <td className="px-6 py-4 text-zinc-300 text-xs">{t.book?.title ?? "—"}</td>
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
                            <td className="px-6 py-4 text-zinc-400 max-w-xs truncate text-xs">{t.description ?? "—"}</td>
                            <td className={cn("px-6 py-4 text-right font-bold font-mono", Number(t.amount) >= 0 ? "text-emerald-400" : "text-red-400")}>
                              {Number(t.amount) >= 0 ? "+" : ""}{formatCurrency(Math.abs(Number(t.amount)))}
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </GlassCard>
            )}

            {/* ── Withdrawal Requests ──────────────────────────────────── */}
            {activeTab === "payouts" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-zinc-500">{withdrawals.length} total request{withdrawals.length !== 1 ? "s" : ""}</p>
                  <button
                    onClick={() => setWithdrawOpen(true)}
                    disabled={netBalance <= 0}
                    className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-40 transition"
                  >
                    <ArrowDownToLine className="h-3.5 w-3.5" /> New Request
                  </button>
                </div>
                {withdrawals.length === 0 ? (
                  <GlassCard className="py-16 text-center" hover={false}>
                    <ArrowDownToLine className="mx-auto h-12 w-12 text-zinc-700 mb-4" />
                    <p className="text-zinc-400 font-medium">No withdrawal requests</p>
                  </GlassCard>
                ) : (
                  withdrawals.map((w, i) => {
                    const cfg = STATUS_CONFIG[w.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
                    const Icon = cfg.icon;
                    return (
                      <motion.div key={w.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                        <GlassCard className="p-6" hover={false}>
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className={cn("rounded-2xl border p-3", cfg.bg)}>
                                <Icon className={cn("h-5 w-5", cfg.color)} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-2xl font-bold text-white">{formatCurrency(Number(w.amount))}</p>
                                  <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase", cfg.bg, cfg.color)}>
                                    {cfg.label}
                                  </span>
                                </div>
                                <p className="text-xs text-zinc-500 mt-1">
                                  Requested {new Date(w.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                                </p>
                                {w.utr && (
                                  <p className="text-xs text-zinc-400 mt-1">
                                    UTR: <span className="font-mono text-emerald-400">{w.utr}</span>
                                  </p>
                                )}
                                {w.admin_notes && (
                                  <p className="text-xs text-zinc-500 mt-1 italic">{w.admin_notes}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </GlassCard>
                      </motion.div>
                    );
                  })
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Withdrawal Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {withdrawOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
            onClick={() => setWithdrawOpen(false)}
          >
            <motion.form
              initial={{ scale: 0.95, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              onSubmit={requestWithdrawal}
              className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-950 p-8 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">Request Withdrawal</h3>
                  <p className="text-sm text-zinc-500 mt-0.5">Available: <span className="text-emerald-400 font-bold">{formatCurrency(netBalance)}</span></p>
                </div>
                <button type="button" onClick={() => setWithdrawOpen(false)} className="rounded-full bg-white/5 p-1.5 text-zinc-400 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Bank details preview */}
              {profile.bank_account_number ? (
                <div className="rounded-2xl border border-white/8 bg-white/4 p-4 space-y-1.5 text-xs font-mono">
                  <p className="text-zinc-500 text-[10px] uppercase font-sans font-semibold mb-2">Payment destination</p>
                  {profile.bank_account_name && <div className="flex justify-between"><span className="text-zinc-500">Name</span><span className="text-zinc-300">{profile.bank_account_name}</span></div>}
                  {profile.bank_account_number && <div className="flex justify-between"><span className="text-zinc-500">Account</span><span className="text-zinc-300">••••{profile.bank_account_number.slice(-4)}</span></div>}
                  {profile.bank_ifsc && <div className="flex justify-between"><span className="text-zinc-500">IFSC</span><span className="text-zinc-300">{profile.bank_ifsc}</span></div>}
                  {profile.bank_upi && <div className="flex justify-between"><span className="text-zinc-500">UPI</span><span className="text-zinc-300">{profile.bank_upi}</span></div>}
                </div>
              ) : (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
                  <p className="text-xs text-amber-300">No bank details found. Please add them in your profile settings first.</p>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Amount (₹)</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={royalties?.available_balance ?? 0}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter withdrawal amount"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white text-sm placeholder-zinc-600"
                />
              </div>
              <button
                type="submit"
                disabled={submitting || !profile.bank_account_number}
                className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 py-3 font-semibold text-white hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <><RefreshCw className="h-4 w-4 animate-spin" /> Submitting…</>
                ) : (
                  <><ArrowDownToLine className="h-4 w-4" /> Submit Request</>
                )}
              </button>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardShell>
  );
}
