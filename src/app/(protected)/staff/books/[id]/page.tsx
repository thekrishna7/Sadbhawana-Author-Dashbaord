"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { BookWorkspace } from "@/components/books/book-workspace";
import { STAFF_NAV } from "@/lib/constants";
import type { Profile } from "@/lib/types/database";

export default function StaffBookPage({ params }: { params: Promise<{ id: string }> }) {
  const [bookId, setBookId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    params.then((p) => setBookId(p.id));
    createClient().auth.getUser().then(({ data }) => {
      if (data.user) createClient().from("profiles").select("*").eq("id", data.user.id).single().then(({ data }) => setProfile(data as Profile));
    });
  }, [params]);

  if (!bookId || !profile) return null;

  return (
    <DashboardShell nav={STAFF_NAV} profile={profile} brand="Staff Ops">
      <BookWorkspace bookId={bookId} basePath="/staff" isAdmin={false} currentUserId={profile.id} />
    </DashboardShell>
  );
}
