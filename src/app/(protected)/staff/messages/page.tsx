"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { MessagesPanel } from "@/components/messages/messages-panel";
import { createClient } from "@/lib/supabase/client";
import { STAFF_NAV } from "@/lib/constants";
import type { Profile } from "@/lib/types/database";

export default function StaffMessagesPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      if (data.user) createClient().from("profiles").select("*").eq("id", data.user.id).single().then(({ data }) => setProfile(data as Profile));
    });
  }, []);
  if (!profile) return null;
  return (
    <DashboardShell nav={STAFF_NAV} profile={profile} brand="Staff Ops" title="Messages">
      <MessagesPanel currentUserId={profile.id} title="Team chat" />
    </DashboardShell>
  );
}
