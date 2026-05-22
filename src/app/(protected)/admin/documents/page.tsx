"use client";

import { useEffect, useState, useCallback } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { GlassCard } from "@/components/ui/glass-card";
import { createClient } from "@/lib/supabase/client";
import { ADMIN_NAV } from "@/lib/constants";
import type { Profile } from "@/lib/types/database";

export default function AdminDocumentsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [docs, setDocs] = useState<{ id: string; title: string; category: string; file_url: string; created_at: string }[]>([]);

  const load = useCallback(async () => {
    const { data } = await createClient().from("documents").select("*").order("created_at", { ascending: false });
    setDocs(data ?? []);
  }, []);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      if (data.user)
        createClient().from("profiles").select("*").eq("id", data.user.id).single().then(({ data }) => setProfile(data as Profile));
    });
    load();
  }, [load]);

  if (!profile) return null;

  return (
    <DashboardShell nav={ADMIN_NAV} profile={profile} brand="Mission Control" title="Documents" subtitle="Agreements, ISBN, contracts">
      <div className="grid gap-4">
        {docs.map((d) => (
          <GlassCard key={d.id} className="flex justify-between p-6!" hover={false}>
            <div>
              <p className="font-medium text-white">{d.title}</p>
              <p className="text-xs text-zinc-500 capitalize">{d.category}</p>
            </div>
            <a href={d.file_url} target="_blank" rel="noreferrer" className="text-violet-400">Open</a>
          </GlassCard>
        ))}
      </div>
    </DashboardShell>
  );
}
