"use client";

import { GlassCard } from "./glass-card";
import { AnimatedCounter } from "./animated-counter";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function MetricCard({
  label,
  value,
  prefix,
  suffix,
  icon: Icon,
  trend,
  className,
}: {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  icon: LucideIcon;
  trend?: string;
  className?: string;
}) {
  return (
    <GlassCard className={cn("relative overflow-hidden", className)} glow>
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-violet-500/10 blur-2xl" />
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-widest text-zinc-500">
            {label}
          </p>
          <p className="text-4xl font-semibold tracking-tight text-white">
            <AnimatedCounter value={value} prefix={prefix} suffix={suffix} />
          </p>
          {trend && (
            <p className="text-sm text-emerald-400/90">{trend}</p>
          )}
        </div>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-400">
          <Icon className="h-7 w-7" />
        </div>
      </div>
    </GlassCard>
  );
}
