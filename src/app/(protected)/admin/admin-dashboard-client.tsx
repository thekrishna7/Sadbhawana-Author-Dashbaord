"use client";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { MetricCard } from "@/components/ui/metric-card";
import { GlassCard } from "@/components/ui/glass-card";
import { ADMIN_NAV } from "@/lib/constants";
import type { Profile } from "@/lib/types/database";
import {
  Users,
  BookOpen,
  DollarSign,
  Wallet,
  Clock,
  GitBranch,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Link from "next/link";

export function AdminDashboardClient({
  profile,
  stats,
  chartData,
  recentActivity,
}: {
  profile: Profile;
  stats: {
    authors: number;
    books: number;
    revenue: number;
    royaltiesPaid: number;
    pendingReviews: number;
    activeProjects: number;
  };
  chartData: { month: string; revenue: number }[];
  recentActivity: { action: string; created_at: string; user_name?: string }[];
}) {
  return (
    <DashboardShell
      nav={ADMIN_NAV}
      profile={profile}
      brand="Author Dashboard"
      title="Overview"
      subtitle="Real-time publishing operations at HQ"
    >
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Total Authors" value={stats.authors} icon={Users} trend="+ Live" />
        <MetricCard label="Active Books" value={stats.books} icon={BookOpen} />
        <MetricCard label="Revenue" value={stats.revenue} prefix="â‚¹" icon={DollarSign} />
        <MetricCard label="Royalties Paid" value={stats.royaltiesPaid} prefix="â‚¹" icon={Wallet} />
        <MetricCard label="Pending Reviews" value={stats.pendingReviews} icon={Clock} />
        <MetricCard label="Active Projects" value={stats.activeProjects} icon={GitBranch} />
      </div>

      <div className="grid gap-10 lg:grid-cols-2">
        <GlassCard className="p-10" glow>
          <h3 className="text-2xl font-semibold text-white mb-8">Revenue trajectory</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#52525b" fontSize={12} />
                <YAxis stroke="#52525b" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "#12121a",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#8b5cf6"
                  fill="url(#rev)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-10">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-semibold text-white">Live activity</h3>
            <Link href="/admin/pipeline" className="text-sm text-violet-400 hover:text-violet-300">
              View pipeline â†’
            </Link>
          </div>
          <ul className="space-y-4 max-h-72 overflow-y-auto">
            {recentActivity.length === 0 ? (
              <li className="text-zinc-500">No activity yet</li>
            ) : (
              recentActivity.map((a, i) => (
                <li
                  key={i}
                  className="flex items-start gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-4"
                >
                  <div className="h-2 w-2 mt-2 rounded-full bg-violet-500 shrink-0" />
                  <div>
                    <p className="text-sm text-white capitalize">
                      {a.action.replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {a.user_name ?? "System"} Â·{" "}
                      {new Date(a.created_at).toLocaleString()}
                    </p>
                  </div>
                </li>
              ))
            )}
          </ul>
        </GlassCard>
      </div>
    </DashboardShell>
  );
}

