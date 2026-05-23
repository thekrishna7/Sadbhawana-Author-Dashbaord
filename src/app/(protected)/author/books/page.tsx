"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { GlassCard } from "@/components/ui/glass-card";
import { createClient } from "@/lib/supabase/client";
import { AUTHOR_NAV, PUBLISHING_STAGES } from "@/lib/constants";
import { BookCover } from "@/components/books/book-cover";
import type { Profile, Book } from "@/lib/types/database";

export default function AuthorBooksPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [books, setBooks] = useState<Book[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: p } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();
      setProfile(p as Profile);
      const { data: b } = await supabase.from("books").select("*").eq("author_id", data.user.id);
      setBooks((b as Book[]) ?? []);
    });
  }, []);

  if (!profile) return null;

  return (
    <DashboardShell nav={AUTHOR_NAV} profile={profile} brand="Creator Workspace" title="My Books" subtitle="Full book workspaces">
      <div className="grid gap-10">
        {books.map((book) => (
          <Link key={book.id} href={`/author/books/${book.id}`}>
            <GlassCard className="grid lg:grid-cols-[200px_1fr] gap-8 p-0! overflow-hidden">
              <div className="relative aspect-[2/3] lg:aspect-auto min-h-[280px] bg-zinc-900 overflow-hidden">
                <BookCover title={book.title} coverUrl={book.cover_url} />
              </div>
              <div className="p-10 flex flex-col justify-center">
                <p className="text-violet-400 text-sm uppercase tracking-wide">
                  {PUBLISHING_STAGES.find((s) => s.key === book.current_stage)?.label}
                </p>
                <h2 className="text-4xl font-bold text-white mt-2">{book.title}</h2>
                <p className="text-zinc-500 mt-4">{book.progress_percent}% complete</p>
              </div>
            </GlassCard>
          </Link>
        ))}
      </div>
    </DashboardShell>
  );
}

