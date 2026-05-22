"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { GlassCard } from "@/components/ui/glass-card";
import { createClient } from "@/lib/supabase/client";
import { STAFF_NAV, PUBLISHING_STAGES } from "@/lib/constants";
import type { Profile, Book } from "@/lib/types/database";

export default function StaffDashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [books, setBooks] = useState<Book[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: p } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();
      setProfile(p as Profile);
      const { data: assignments } = await supabase
        .from("book_staff_assignments")
        .select("book_id")
        .eq("staff_id", data.user.id);
      const ids = assignments?.map((a) => a.book_id) ?? [];
      if (ids.length) {
        const { data: b } = await supabase.from("books").select("*").in("id", ids);
        setBooks((b as Book[]) ?? []);
      }
    });
  }, []);

  if (!profile) return null;

  return (
    <DashboardShell nav={STAFF_NAV} profile={profile} brand="Staff Ops" title="Dashboard" subtitle="Your assigned publishing projects">
      <div className="grid gap-6 md:grid-cols-2">
        {books.map((book) => (
          <Link key={book.id} href={`/staff/books/${book.id}`}>
            <GlassCard>
              <p className="text-xl font-semibold text-white">{book.title}</p>
              <p className="text-sm text-violet-400 mt-2 capitalize">
                {PUBLISHING_STAGES.find((s) => s.key === book.current_stage)?.label}
              </p>
            </GlassCard>
          </Link>
        ))}
        {books.length === 0 && <p className="text-zinc-500">No books assigned. HQ will assign projects.</p>}
      </div>
    </DashboardShell>
  );
}
