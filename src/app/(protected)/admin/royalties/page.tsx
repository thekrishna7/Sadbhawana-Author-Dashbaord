"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { GlassCard } from "@/components/ui/glass-card";
import { createClient } from "@/lib/supabase/client";
import { ADMIN_NAV } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import type { Profile, WithdrawalRequest } from "@/lib/types/database";
import { useRealtimeTable } from "@/hooks/use-realtime";

export default function AdminRoyaltiesPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [withdrawals, setWithdrawals] = useState<
    (WithdrawalRequest & { author?: Profile })[]
  >([]);

  const supabase = createClient();

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("withdrawal_requests")
      .select("*, author:profiles!withdrawal_requests_author_id_fkey(full_name, email)")
      .order("created_at", { ascending: false });
    setWithdrawals((data as typeof withdrawals) ?? []);
  }, [supabase]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user)
        supabase.from("profiles").select("*").eq("id", data.user.id).single().then(({ data }) => setProfile(data as Profile));
    });
    load();
  }, [supabase, load]);

  useRealtimeTable("withdrawal_requests", null, load);

  async function process(id: string, action: "approve" | "reject" | "paid", utr?: string) {
    await fetch("/api/admin/withdrawals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action, utr }),
    });
    load();
  }

  if (!profile) return null;

  return (
    <DashboardShell
      nav={ADMIN_NAV}
      profile={profile}
      brand="Mission Control"
      title="Royalties"
      subtitle="Withdrawal requests & payouts"
    >
      <div className="space-y-6">
        {withdrawals.map((w) => (
          <GlassCard key={w.id} className="p-8!" hover={false}>
            <div className="flex flex-wrap justify-between gap-6">
              <div>
                <p className="text-xl font-semibold text-white">{w.author?.full_name}</p>
                <p className="text-3xl font-bold text-emerald-400 mt-2">
                  {formatCurrency(Number(w.amount))}
                </p>
                <p className="text-sm text-zinc-500 mt-2 capitalize">{w.status}</p>
                <pre className="text-xs text-zinc-600 mt-4 font-mono">
                  {JSON.stringify(w.bank_snapshot, null, 2)}
                </pre>
              </div>
              {w.status === "pending" && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => process(w.id, "approve")}
                    className="rounded-xl bg-emerald-500/20 px-4 py-2 text-sm text-emerald-400"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => process(w.id, "reject")}
                    className="rounded-xl bg-red-500/20 px-4 py-2 text-sm text-red-400"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => {
                      const utr = prompt("Enter UTR number");
                      if (utr) process(w.id, "paid", utr);
                    }}
                    className="rounded-xl bg-violet-600 px-4 py-2 text-sm text-white"
                  >
                    Mark paid
                  </button>
                </div>
              )}
            </div>
          </GlassCard>
        ))}
        {withdrawals.length === 0 && (
          <p className="text-zinc-500">No withdrawal requests.</p>
        )}
      </div>
    </DashboardShell>
  );
}
