"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AuthorWorkspace } from "@/components/authors/author-workspace";
import type { Profile } from "@/lib/types/database";

export default function AdminAuthorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [authorId, setAuthorId] = useState<string | null>(null);
  const [adminProfile, setAdminProfile] = useState<Profile | null>(null);

  useEffect(() => {
    params.then((p) => setAuthorId(p.id));
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user)
        supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .single()
          .then(({ data }) => setAdminProfile(data as Profile));
    });
  }, [params]);

  if (!authorId || !adminProfile) return null;

  return <AuthorWorkspace authorId={authorId} adminProfile={adminProfile} />;
}
