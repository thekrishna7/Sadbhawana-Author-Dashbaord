import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminDashboardClient } from "./admin-dashboard-client";

export default async function AdminOverviewPage() {
  const profile = await getSessionProfile();
  if (!profile) return null;

  const supabase = await createClient();

  const [
    { count: authors },
    { count: books },
    { data: sales },
    { data: payouts },
    { data: pendingBooks },
    { data: activeBooks },
    { data: activity },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "author"),
    supabase.from("books").select("*", { count: "exact", head: true }),
    supabase.from("sales").select("total_revenue, monthly_revenue"),
    supabase
      .from("royalty_transactions")
      .select("amount")
      .eq("tx_type", "payout"),
    supabase
      .from("books")
      .select("*", { count: "exact", head: true })
      .in("current_stage", ["submitted", "review"]),
    supabase
      .from("books")
      .select("*", { count: "exact", head: true })
      .neq("current_stage", "published"),
    supabase
      .from("activity_logs")
      .select("action, created_at, user:profiles(full_name)")
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  const revenue =
    sales?.reduce((s, r) => s + Number(r.total_revenue || 0), 0) ?? 0;
  const royaltiesPaid =
    payouts?.reduce((s, r) => s + Math.abs(Number(r.amount)), 0) ?? 0;

  const chartData = [
    { month: "Jan", revenue: revenue * 0.6 },
    { month: "Feb", revenue: revenue * 0.7 },
    { month: "Mar", revenue: revenue * 0.75 },
    { month: "Apr", revenue: revenue * 0.85 },
    { month: "May", revenue: revenue },
  ];

  return (
    <AdminDashboardClient
      profile={profile}
      stats={{
        authors: authors ?? 0,
        books: books ?? 0,
        revenue,
        royaltiesPaid,
        pendingReviews: Number(pendingBooks ?? 0),
        activeProjects: Number(activeBooks ?? 0),
      }}
      chartData={chartData}
      recentActivity={
        (activity ?? []).map((a) => ({
          action: a.action,
          created_at: a.created_at,
          user_name: (a.user as { full_name?: string })?.full_name,
        }))
      }
    />
  );
}
