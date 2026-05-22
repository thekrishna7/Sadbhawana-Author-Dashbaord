"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GlassCard } from "@/components/ui/glass-card";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { Sales } from "@/lib/types/database";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export function SalesPanel({
  bookId,
  sales,
  isAdmin,
  onUpdate,
}: {
  bookId: string;
  sales?: Sales | null;
  isAdmin: boolean;
  onUpdate: () => void;
}) {
  const [form, setForm] = useState({
    copies_sold: sales?.copies_sold ?? 0,
    website_sales: sales?.website_sales ?? 0,
    amazon_sales: sales?.amazon_sales ?? 0,
    monthly_revenue: sales?.monthly_revenue ?? 0,
    total_revenue: sales?.total_revenue ?? 0,
    ranking: sales?.ranking ?? "",
  });
  const [saving, setSaving] = useState(false);

  const chartData = [
    { name: "Website", value: form.website_sales },
    { name: "Amazon", value: form.amazon_sales },
  ];

  async function save() {
    if (!isAdmin) return;
    setSaving(true);
    const supabase = createClient();
    const payload = {
      book_id: bookId,
      copies_sold: Number(form.copies_sold),
      website_sales: Number(form.website_sales),
      amazon_sales: Number(form.amazon_sales),
      monthly_revenue: Number(form.monthly_revenue),
      total_revenue: Number(form.total_revenue),
      ranking: form.ranking ? Number(form.ranking) : null,
    };
    if (sales?.id) {
      await supabase.from("sales").update(payload).eq("id", sales.id);
    } else {
      await supabase.from("sales").insert(payload);
    }
    setSaving(false);
    onUpdate();
  }

  return (
    <div className="space-y-10">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Metric label="Total copies" value={formatNumber(form.copies_sold)} />
        <Metric label="Website sales" value={formatNumber(form.website_sales)} />
        <Metric label="Amazon sales" value={formatNumber(form.amazon_sales)} />
        <Metric label="Monthly revenue" value={formatCurrency(Number(form.monthly_revenue))} />
      </div>

      <GlassCard className="p-10" glow>
        <h3 className="text-xl font-semibold text-white mb-6">Channel breakdown</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="name" stroke="#71717a" />
              <YAxis stroke="#71717a" />
              <Tooltip
                contentStyle={{
                  background: "#12121a",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                }}
              />
              <Bar dataKey="value" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      {isAdmin && (
        <GlassCard className="max-w-xl space-y-4 p-10">
          <h3 className="text-lg font-semibold text-white">Edit sales data</h3>
          {(
            [
              "copies_sold",
              "website_sales",
              "amazon_sales",
              "monthly_revenue",
              "total_revenue",
              "ranking",
            ] as const
          ).map((key) => (
            <div key={key}>
              <label className="text-sm text-zinc-500 capitalize">
                {key.replace(/_/g, " ")}
              </label>
              <input
                className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
                value={String(form[key])}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              />
            </div>
          ))}
          <button
            onClick={save}
            disabled={saving}
            className="rounded-2xl bg-violet-600 px-8 py-3 text-white font-medium hover:bg-violet-500 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save & sync to author"}
          </button>
        </GlassCard>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <GlassCard hover={false} className="p-8!">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="text-3xl font-bold text-white mt-2">{value}</p>
    </GlassCard>
  );
}
