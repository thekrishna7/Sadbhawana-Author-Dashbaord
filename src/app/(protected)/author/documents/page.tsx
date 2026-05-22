"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { GlassCard } from "@/components/ui/glass-card";
import { createClient } from "@/lib/supabase/client";
import { AUTHOR_NAV } from "@/lib/constants";
import type { Profile } from "@/lib/types/database";

export default function AuthorDocumentsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [docs, setDocs] = useState<{ id: string; title: string; file_url: string; category: string }[]>([]);

  useEffect(() => {
    createClient().auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: p } = await createClient().from("profiles").select("*").eq("id", data.user.id).single();
      setProfile(p as Profile);
      const { data: d } = await createClient().from("documents").select("*").or(`author_id.eq.${data.user.id}`);
      setDocs(d ?? []);
    });
  }, []);

  if (!profile) return null;

  return (
    <DashboardShell nav={AUTHOR_NAV} profile={profile} brand="Creator OS" title="Documents">
      <div className="grid gap-4">
        {docs.map((d) => (
          <GlassCard key={d.id} className="flex justify-between p-6!" hover={false}>
            <div>
              <p className="font-medium text-white">{d.title}</p>
              <p className="text-xs text-zinc-500 capitalize">{d.category}</p>
            </div>
            <a href={d.file_url} target="_blank" rel="noreferrer" className="text-violet-400">Preview</a>
          </GlassCard>
        ))}
        {docs.length === 0 && <p className="text-zinc-500">No documents from HQ yet.</p>}
      </div>
    </DashboardShell>
  );
}
