"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { createClient } from "@/lib/supabase/client";
import { STAFF_NAV } from "@/lib/constants";
import type { Profile } from "@/lib/types/database";

export default function StaffSettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      if (data.user) createClient().from("profiles").select("*").eq("id", data.user.id).single().then(({ data }) => setProfile(data as Profile));
    });
  }, []);
  if (!profile) return null;
  return (
    <DashboardShell nav={STAFF_NAV} profile={profile} brand="Staff Workspace" title="Settings">
      <p className="text-zinc-500">Account managed by HQ.</p>
    </DashboardShell>
  );
}

