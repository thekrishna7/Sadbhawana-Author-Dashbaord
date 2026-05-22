"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { GlassCard } from "@/components/ui/glass-card";
import { createClient } from "@/lib/supabase/client";
import { ADMIN_NAV } from "@/lib/constants";
import type { Profile } from "@/lib/types/database";
import { Sparkles } from "lucide-react";

export default function AICenterPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      if (data.user)
        createClient().from("profiles").select("*").eq("id", data.user.id).single().then(({ data }) => setProfile(data as Profile));
    });
  }, []);

  function analyze() {
    setResponse(
      `Publishing intelligence summary:\n\n• Pipeline health: Monitor books in Review and Editing stages.\n• Royalties: Review pending withdrawals in Royalties tab.\n• Authors: Ensure profile and bank details are complete before payouts.\n\nQuery: "${prompt}"\n\nConnect an LLM API key in Settings to enable live AI responses.`
    );
  }

  if (!profile) return null;

  return (
    <DashboardShell nav={ADMIN_NAV} profile={profile} brand="Mission Control" title="AI Center" subtitle="Publishing intelligence">
      <GlassCard className="p-10 space-y-6" glow>
        <div className="flex items-center gap-3 text-violet-400">
          <Sparkles className="h-6 w-6" />
          <span className="font-semibold">HQ Assistant</span>
        </div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask about pipeline, royalties, author performance…"
          className="w-full min-h-[120px] rounded-2xl border border-white/10 bg-white/5 p-4 text-white"
        />
        <button onClick={analyze} className="rounded-2xl bg-violet-600 px-8 py-3 text-white font-medium">
          Analyze
        </button>
        {response && (
          <pre className="whitespace-pre-wrap text-sm text-zinc-300 rounded-2xl bg-black/30 p-6">{response}</pre>
        )}
      </GlassCard>
    </DashboardShell>
  );
}
