"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { BookWorkspace } from "@/components/books/book-workspace";
import { AUTHOR_NAV } from "@/lib/constants";
import type { Profile } from "@/lib/types/database";

export default function AuthorBookPage({ params }: { params: Promise<{ id: string }> }) {
  const [bookId, setBookId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    params.then((p) => setBookId(p.id));
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user)
        supabase.from("profiles").select("*").eq("id", data.user.id).single().then(({ data }) => setProfile(data as Profile));
    });
  }, [params]);

  if (!bookId || !profile) return null;

  return (
    <DashboardShell nav={AUTHOR_NAV} profile={profile} brand="Creator OS">
      <BookWorkspace bookId={bookId} basePath="/author/books" isAdmin={false} currentUserId={profile.id} />
    </DashboardShell>
  );
}
