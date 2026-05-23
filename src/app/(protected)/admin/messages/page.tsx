"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { MessagesPanel } from "@/components/messages/messages-panel";
import { createClient } from "@/lib/supabase/client";
import { ADMIN_NAV } from "@/lib/constants";
import type { Profile } from "@/lib/types/database";

export default function AdminMessagesPage() {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      if (data.user)
        createClient().from("profiles").select("*").eq("id", data.user.id).single().then(({ data }) => setProfile(data as Profile));
    });
  }, []);

  if (!profile) return null;

  return (
    <DashboardShell nav={ADMIN_NAV} profile={profile} brand="Author Dashboard" title="Messages" subtitle="HQ communications">
      <MessagesPanel currentUserId={profile.id} title="HQ Inbox" />
    </DashboardShell>
  );
}

