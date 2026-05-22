"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { GlassCard } from "@/components/ui/glass-card";
import { MetricCard } from "@/components/ui/metric-card";
import { ErrorBanner } from "@/components/ui/error-banner";
import { createClient } from "@/lib/supabase/client";
import { AUTHOR_NAV, PUBLISHING_STAGES } from "@/lib/constants";
import type { Profile, Book } from "@/lib/types/database";
import { BookOpen, Wallet, TrendingUp, Loader2 } from "lucide-react";

import { BookCover } from "@/components/books/book-cover";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

export default function AuthorDashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [royalties, setRoyalties] = useState<{
    available_balance: number;
    lifetime_earnings: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const load = useCallback(async () => {
    setError(null);
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      setError(authErr?.message ?? "Not signed in");
      setLoading(false);
      return;
    }

    const { data: p, error: pErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (pErr || !p) {
      setError(pErr?.message ?? "Profile not found");
      setLoading(false);
      return;
    }

    if (p.role !== "author" && p.role !== "super_admin") {
      setError("This portal is for authors. Use the correct login page for your role.");
      setLoading(false);
      return;
    }

    setProfile(p as Profile);

    const { data: b, error: bErr } = await supabase
      .from("books")
      .select("*")
      .eq("author_id", user.id)
      .order("updated_at", { ascending: false });

    if (bErr) setError(bErr.message);
    else setBooks((b as Book[]) ?? []);

    const { data: r } = await supabase
      .from("author_royalties")
      .select("*")
      .eq("author_id", user.id)
      .maybeSingle();

    setRoyalties(r);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("author-dash")
      .on("postgres_changes", { event: "*", schema: "public", table: "books" }, load)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "author_royalties" },
        load
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, load]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex">
        {/* Sidebar Skeleton */}
        <aside className="w-72 border-r border-white/5 bg-zinc-950 p-6 flex flex-col gap-6 hidden lg:flex shrink-0">
          <div className="h-8 w-32 bg-white/5 rounded-xl shimmer" />
          <div className="space-y-4">
            <div className="h-10 w-full bg-white/5 rounded-xl shimmer" />
            <div className="h-10 w-full bg-white/5 rounded-xl shimmer" />
            <div className="h-10 w-full bg-white/5 rounded-xl shimmer" />
          </div>
        </aside>
        
        {/* Main Content Skeleton */}
        <main className="flex-1 p-8 lg:p-12 space-y-8 max-w-7xl mx-auto w-full">
          <div className="space-y-3">
            <Skeleton className="h-8 w-64 rounded-xl shimmer" />
            <Skeleton className="h-4 w-96 rounded-xl shimmer" />
          </div>
          
          <div className="grid gap-6 md:grid-cols-3">
            <Skeleton className="h-32 rounded-3xl shimmer" />
            <Skeleton className="h-32 rounded-3xl shimmer" />
            <Skeleton className="h-32 rounded-3xl shimmer" />
          </div>
          
          <div className="space-y-6">
            <Skeleton className="h-6 w-32 rounded-xl shimmer" />
            <div className="grid gap-8 lg:grid-cols-2">
              <Skeleton className="h-[350px] rounded-3xl shimmer" />
              <Skeleton className="h-[350px] rounded-3xl shimmer" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="ambient-bg min-h-screen flex items-center justify-center p-10">
        <ErrorBanner message={error ?? "Could not load profile"} />
      </div>
    );
  }

  return (
    <DashboardShell
      nav={AUTHOR_NAV}
      profile={profile}
      brand="Creator OS"
      title={`Welcome, ${profile.full_name.split(" ")[0]}`}
      subtitle={`Signed in as ${profile.email}`}
    >
      <ErrorBanner message={error ?? ""} onDismiss={() => setError(null)} />

      {profile.role === "super_admin" && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-6 py-4 text-sm text-amber-200">
          You are logged in as <strong>Super Admin</strong>. Author books only appear when you sign in with an{" "}
          <strong>author account</strong> at{" "}
          <Link href="/author/login" className="underline">
            /author/login
          </Link>
          .
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <MetricCard label="My books" value={books.length} icon={BookOpen} />
        <MetricCard
          label="Available royalties"
          value={Number(royalties?.available_balance ?? 0)}
          prefix="₹"
          icon={Wallet}
        />
        <MetricCard
          label="Lifetime earnings"
          value={Number(royalties?.lifetime_earnings ?? 0)}
          prefix="₹"
          icon={TrendingUp}
        />
      </div>

      <h2 className="text-2xl font-semibold text-white">My Books</h2>
      <div className="grid gap-8 lg:grid-cols-2">
        {books.map((book) => (
          <Link key={book.id} href={`/author/books/${book.id}`}>
            <GlassCard className="overflow-hidden p-0! group">
              <div className="relative aspect-[21/9] bg-gradient-to-br from-violet-900/20 to-zinc-900 overflow-hidden">
                <BookCover
                  title={book.title}
                  coverUrl={book.cover_url}
                  className="opacity-80 group-hover:scale-105 transition duration-500"
                />
              </div>
              <div className="p-10">
                <p className="text-sm text-violet-400 uppercase tracking-wide">
                  {PUBLISHING_STAGES.find((s) => s.key === book.current_stage)?.label}
                </p>
                <h3 className="text-3xl font-bold text-white mt-2">{book.title}</h3>
                <div className="mt-6 h-2 rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-400"
                    style={{ width: `${book.progress_percent}%` }}
                  />
                </div>
                <p className="text-zinc-500 mt-2">
                  {book.progress_percent}% · Launch{" "}
                  {book.launch_date
                    ? new Date(book.launch_date).toLocaleDateString()
                    : "TBD"}
                </p>
              </div>
            </GlassCard>
          </Link>
        ))}
        {books.length === 0 && (
          <div className="col-span-full">
            <EmptyState
              icon={BookOpen}
              title="No books assigned yet"
              description={`Logged in as ${profile.email}. Editorial administrators must link your account profile to a title in the administrator workspace before you can view manuscript drafts, cover concepts, or royalties.`}
              color="violet"
            />
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
