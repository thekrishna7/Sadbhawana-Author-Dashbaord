"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { GlassCard } from "@/components/ui/glass-card";
import { CreateUserModal } from "@/components/admin/create-user-modal";
import { createClient } from "@/lib/supabase/client";
import { ADMIN_NAV } from "@/lib/constants";
import type { Profile } from "@/lib/types/database";
import { Plus, Search, X, User, Mail, Shield, Settings } from "lucide-react";
import { useRealtimeTable } from "@/hooks/use-realtime";
import { getInitials } from "@/lib/utils";
import { ManageAccountModal } from "@/components/admin/manage-account-modal";

const STATUS_COLORS: Record<string, string> = {
  active: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
  suspended: "text-red-400 bg-red-500/10 border-red-500/25",
  locked: "text-pink-400 bg-pink-500/10 border-pink-500/25",
  disabled: "text-zinc-400 bg-white/5 border-white/10",
  pending: "text-amber-400 bg-amber-500/10 border-amber-500/25",
};

export default function AdminStaffPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [modal, setModal] = useState(false);
  const [managingStaff, setManagingStaff] = useState<Profile | null>(null);
  const [search, setSearch] = useState("");
  const supabase = createClient();

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "staff")
      .order("created_at", { ascending: false });
    setStaff((data as Profile[]) ?? []);
  }, [supabase]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user)
        supabase.from("profiles").select("*").eq("id", data.user.id).single().then(({ data }) => setProfile(data as Profile));
    });
    load();
  }, [supabase, load]);

  useRealtimeTable("profiles", null, load);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter(
      (s) =>
        s.full_name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.phone ?? "").toLowerCase().includes(q)
    );
  }, [staff, search]);

  if (!profile) return null;

  return (
    <DashboardShell
      nav={ADMIN_NAV}
      profile={profile}
      brand="Author Dashboard"
      title="Staff"
      subtitle="Editorial & production team"
      actions={
        <button
          onClick={() => setModal(true)}
          className="flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 transition shadow-lg shadow-violet-600/20"
        >
          <Plus className="h-4 w-4" /> New Staff
        </button>
      }
    >
      {/* â”€â”€ Search Bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone..."
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
        <span className="text-xs text-zinc-600 whitespace-nowrap">
          {filtered.length} of {staff.length} members
        </span>
      </div>

      {/* â”€â”€ Staff Grid â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center mb-4">
            <User className="h-7 w-7 text-zinc-600" />
          </div>
          <p className="text-base font-semibold text-zinc-400">No staff found</p>
          <p className="text-sm text-zinc-600 mt-1">
            {search ? `No results for "${search}"` : "Add your first staff member."}
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <GlassCard key={s.id} hover={false} className="p-0! overflow-hidden">
              {/* Top accent bar */}
              <div className="h-1 w-full bg-gradient-to-r from-violet-600 to-blue-500" />
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-xl bg-violet-500/20 flex items-center justify-center text-base font-bold text-violet-300 shrink-0">
                    {getInitials(s.full_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{s.full_name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Shield className="h-3 w-3 text-violet-400 shrink-0" />
                      <p className="text-[11px] text-violet-400 font-semibold uppercase tracking-wider">Staff</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${STATUS_COLORS[s.status] ?? STATUS_COLORS.pending}`}>
                    {s.status}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <Mail className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
                    <span className="truncate">{s.email}</span>
                  </div>
                  {s.phone && (
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <span className="text-zinc-600">ðŸ“ž</span>
                      <span>{s.phone}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-white/5 pt-3">
                  <span className="text-[10px] text-zinc-600">
                    Joined {new Date(s.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                  <button
                    onClick={() => setManagingStaff(s)}
                    className="flex items-center gap-1 rounded-xl border border-violet-500/30 bg-violet-500/5 px-3 py-1.5 text-[11px] font-bold text-violet-300 hover:bg-violet-500/25 transition cursor-pointer"
                  >
                    <Settings className="h-3 w-3" /> Manage
                  </button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <CreateUserModal open={modal} onClose={() => setModal(false)} onCreated={load} defaultRole="staff" />

      {managingStaff && (
        <ManageAccountModal
          open={!!managingStaff}
          onClose={() => setManagingStaff(null)}
          profile={managingStaff}
          onUpdate={load}
        />
      )}
    </DashboardShell>
  );
}

