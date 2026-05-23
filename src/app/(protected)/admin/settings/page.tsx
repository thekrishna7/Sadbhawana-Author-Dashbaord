"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { GlassCard } from "@/components/ui/glass-card";
import { createClient } from "@/lib/supabase/client";
import { ADMIN_NAV } from "@/lib/constants";
import type { Profile } from "@/lib/types/database";

export default function AdminSettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      if (data.user)
        createClient().from("profiles").select("*").eq("id", data.user.id).single().then(({ data }) => setProfile(data as Profile));
    });
  }, []);

  if (!profile) return null;

  return (
    <DashboardShell nav={ADMIN_NAV} profile={profile} brand="Author Dashboard" title="Settings" subtitle="System configuration">
      <GlassCard className="max-w-2xl space-y-6 p-10" hover={false}>
        <h3 className="text-lg font-semibold text-white">Environment</h3>
        <p className="text-sm text-zinc-500">
          Supabase project: wdppaupdvxrbgfwtngka
        </p>
        <p className="text-sm text-zinc-500">
          Add <code className="text-violet-400">SUPABASE_SERVICE_ROLE_KEY</code> to .env.local for user provisioning.
        </p>
        <h3 className="text-lg font-semibold text-white pt-4">Security</h3>
        <ul className="text-sm text-zinc-500 space-y-2 list-disc pl-5">
          <li>No public registration</li>
          <li>Row Level Security enabled on all tables</li>
          <li>Role-based portal separation</li>
        </ul>
      </GlassCard>
    </DashboardShell>
  );
}

