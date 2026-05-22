"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { GlassCard } from "@/components/ui/glass-card";
import { createClient } from "@/lib/supabase/client";
import { AUTHOR_NAV } from "@/lib/constants";
import type { Profile } from "@/lib/types/database";

export default function AuthorSettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      if (data.user) createClient().from("profiles").select("*").eq("id", data.user.id).single().then(({ data }) => setProfile(data as Profile));
    });
  }, []);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await createClient().auth.updateUser({ password });
    setMsg(error ? error.message : "Password updated.");
  }

  if (!profile) return null;

  return (
    <DashboardShell nav={AUTHOR_NAV} profile={profile} brand="Creator OS" title="Settings">
      <GlassCard className="max-w-md space-y-4 p-10" hover={false}>
        <h3 className="font-semibold text-white">Change password</h3>
        <form onSubmit={changePassword} className="space-y-4">
          <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white" placeholder="New password" />
          <button type="submit" className="rounded-2xl bg-violet-600 px-6 py-3 text-white">Update</button>
          {msg && <p className="text-sm text-zinc-400">{msg}</p>}
        </form>
      </GlassCard>
    </DashboardShell>
  );
}
