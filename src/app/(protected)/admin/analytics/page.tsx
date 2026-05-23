"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { MetricCard } from "@/components/ui/metric-card";
import { createClient } from "@/lib/supabase/client";
import { ADMIN_NAV } from "@/lib/constants";
import type { Profile } from "@/lib/types/database";
import { TrendingUp, Users, BookOpen } from "lucide-react";

export default function AnalyticsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState({ revenue: 0, books: 0, authors: 0 });

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user)
        supabase.from("profiles").select("*").eq("id", data.user.id).single().then(({ data }) => setProfile(data as Profile));
    });
    Promise.all([
      supabase.from("sales").select("total_revenue"),
      supabase.from("books").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "author"),
    ]).then(([sales, books, authors]) => {
      setStats({
        revenue: sales.data?.reduce((s, r) => s + Number(r.total_revenue), 0) ?? 0,
        books: books.count ?? 0,
        authors: authors.count ?? 0,
      });
    });
  }, []);

  if (!profile) return null;

  return (
    <DashboardShell nav={ADMIN_NAV} profile={profile} brand="Author Dashboard" title="Analytics" subtitle="Enterprise insights">
      <div className="grid gap-6 md:grid-cols-3">
        <MetricCard label="Total revenue" value={stats.revenue} prefix="â‚¹" icon={TrendingUp} />
        <MetricCard label="Books" value={stats.books} icon={BookOpen} />
        <MetricCard label="Authors" value={stats.authors} icon={Users} />
      </div>
    </DashboardShell>
  );
}

