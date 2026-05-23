"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { GlassCard } from "@/components/ui/glass-card";
import { createClient } from "@/lib/supabase/client";
import { ADMIN_NAV, PUBLISHING_STAGES } from "@/lib/constants";
import type { Profile, Book } from "@/lib/types/database";

export default function PipelinePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [byStage, setByStage] = useState<Record<string, Book[]>>({});

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user)
        supabase.from("profiles").select("*").eq("id", data.user.id).single().then(({ data }) => setProfile(data as Profile));
    });
    supabase.from("books").select("*").then(({ data }) => {
      const grouped: Record<string, Book[]> = {};
      PUBLISHING_STAGES.forEach((s) => {
        grouped[s.key] = (data ?? []).filter((b) => b.current_stage === s.key) as Book[];
      });
      setByStage(grouped);
    });
  }, []);

  if (!profile) return null;

  return (
    <DashboardShell nav={ADMIN_NAV} profile={profile} brand="Author Dashboard" title="Publishing Pipeline" subtitle="Kanban by stage">
      <div className="flex gap-6 overflow-x-auto pb-6">
        {PUBLISHING_STAGES.map((stage) => (
          <div key={stage.key} className="min-w-[280px] shrink-0">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-4">{stage.label}</h3>
            <div className="space-y-4">
              {(byStage[stage.key] ?? []).map((book) => (
                <Link key={book.id} href={`/admin/books/${book.id}`}>
                  <GlassCard className="p-4!">
                    <p className="font-medium text-white">{book.title}</p>
                    <p className="text-xs text-zinc-500 mt-1">{book.progress_percent}%</p>
                  </GlassCard>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </DashboardShell>
  );
}

