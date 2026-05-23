"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { GlassCard } from "@/components/ui/glass-card";
import { createClient } from "@/lib/supabase/client";
import { AUTHOR_NAV } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import type { Profile } from "@/lib/types/database";
import { useRealtimeTable } from "@/hooks/use-realtime";
import { X } from "lucide-react";
import { sendNotification } from "@/lib/notifications";

export default function AuthorRoyaltiesPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [royalties, setRoyalties] = useState<{
    available_balance: number;
    pending_balance: number;
    lifetime_earnings: number;
    last_payout_at: string | null;
    next_payout_at: string | null;
  } | null>(null);
  const [transactions, setTransactions] = useState<{ amount: number; description: string; created_at: string; tx_type: string }[]>([]);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [amount, setAmount] = useState("");

  const supabase = createClient();

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    setProfile(p as Profile);
    const { data: r } = await supabase.from("author_royalties").select("*").eq("author_id", user.id).single();
    setRoyalties(r);
    const { data: tx } = await supabase.from("royalty_transactions").select("*").eq("author_id", user.id).order("created_at", { ascending: false }).limit(20);
    setTransactions(tx ?? []);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);
  useRealtimeTable("author_royalties", profile ? { column: "author_id", value: profile.id } : null, load);

  async function requestWithdrawal(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    const amt = Number(amount);
    if (amt <= 0 || amt > Number(royalties?.available_balance ?? 0)) return;
    if (!profile.bank_account_number) {
      alert("Add bank details in Profile first.");
      return;
    }
    const { error: insertErr } = await supabase.from("withdrawal_requests").insert({
      author_id: profile.id,
      amount: amt,
      bank_snapshot: {
        account_name: profile.bank_account_name,
        account_number: profile.bank_account_number,
        ifsc: profile.bank_ifsc,
        upi: profile.bank_upi,
      },
    });

    if (!insertErr) {
      // Query admins to send email and in-app notification
      const { data: admins } = await supabase.from("profiles").select("id").eq("role", "super_admin");
      if (admins && admins.length > 0) {
        await sendNotification({
          userIds: admins.map((admin) => admin.id),
          type: "warning",
          title: "New Royalty Withdrawal Request",
          body: `${profile.full_name || "Author"} has requested a royalty withdrawal of â‚¹${amt}.`,
          link: "/admin/royalties",
        });
      }
    }

    setWithdrawOpen(false);
    setAmount("");
    load();
  }

  if (!profile) return null;

  return (
    <DashboardShell nav={AUTHOR_NAV} profile={profile} brand="Creator Workspace" title="Royalties" subtitle="Banking-grade earnings dashboard">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <GlassCard glow className="p-8!">
          <p className="text-sm text-zinc-500">Available</p>
          <p className="text-4xl font-bold text-emerald-400 mt-2">{formatCurrency(Number(royalties?.available_balance ?? 0))}</p>
        </GlassCard>
        <GlassCard className="p-8!">
          <p className="text-sm text-zinc-500">Pending</p>
          <p className="text-4xl font-bold text-amber-400 mt-2">{formatCurrency(Number(royalties?.pending_balance ?? 0))}</p>
        </GlassCard>
        <GlassCard className="p-8!">
          <p className="text-sm text-zinc-500">Lifetime</p>
          <p className="text-4xl font-bold text-white mt-2">{formatCurrency(Number(royalties?.lifetime_earnings ?? 0))}</p>
        </GlassCard>
        <GlassCard className="p-8! flex items-center justify-center">
          <button
            onClick={() => setWithdrawOpen(true)}
            className="rounded-2xl bg-violet-600 px-8 py-4 font-semibold text-white hover:bg-violet-500 w-full"
          >
            Request withdrawal
          </button>
        </GlassCard>
      </div>

      <GlassCard className="p-10" hover={false}>
        <h3 className="text-xl font-semibold text-white mb-6">History</h3>
        <ul className="space-y-3">
          {transactions.map((t, i) => (
            <li key={i} className="flex justify-between border-b border-white/5 py-3 text-sm">
              <span className="text-zinc-400">{t.description ?? t.tx_type}</span>
              <span className={Number(t.amount) >= 0 ? "text-emerald-400" : "text-red-400"}>
                {formatCurrency(Number(t.amount))}
              </span>
            </li>
          ))}
        </ul>
      </GlassCard>

      <AnimatePresence>
        {withdrawOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-10" onClick={() => setWithdrawOpen(false)}>
            <motion.form initial={{ scale: 0.95 }} animate={{ scale: 1 }} onClick={(e) => e.stopPropagation()} onSubmit={requestWithdrawal} className="glass-strong max-w-md w-full rounded-3xl p-10 space-y-6">
              <div className="flex justify-between">
                <h2 className="text-2xl font-bold text-white">Request withdrawal</h2>
                <button type="button" onClick={() => setWithdrawOpen(false)}><X /></button>
              </div>
              <p className="text-sm text-zinc-500">Available: {formatCurrency(Number(royalties?.available_balance ?? 0))}</p>
              <input type="number" required min={1} max={royalties?.available_balance} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white" />
              <button type="submit" className="w-full rounded-2xl bg-violet-600 py-4 text-white font-semibold">Submit request</button>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardShell>
  );
}

