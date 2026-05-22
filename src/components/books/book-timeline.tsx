"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeTable } from "@/hooks/use-realtime";
import type { ActivityLog } from "@/lib/types/database";
import { Clock } from "lucide-react";

export function BookTimeline({ bookId }: { bookId: string }) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("activity_logs")
      .select("*, user:profiles(full_name)")
      .eq("book_id", bookId)
      .order("created_at", { ascending: false });
    setLogs((data as ActivityLog[]) ?? []);
  }, [bookId]);

  useEffect(() => {
    load();
  }, [load]);
  useRealtimeTable("activity_logs", { column: "book_id", value: bookId }, load);

  return (
    <div className="relative space-y-0">
      <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-violet-500/50 to-transparent" />
      {logs.map((log) => (
        <div key={log.id} className="relative flex gap-8 pb-10 pl-16">
          <div className="absolute left-4 flex h-5 w-5 items-center justify-center rounded-full bg-violet-500/30 ring-4 ring-[#050508]">
            <Clock className="h-3 w-3 text-violet-400" />
          </div>
          <div className="flex-1 rounded-2xl border border-white/6 bg-white/[0.02] p-6">
            <p className="font-medium text-white capitalize">
              {log.action.replace(/_/g, " ")}
            </p>
            <p className="text-sm text-zinc-500 mt-1">
              {(log as ActivityLog & { user?: { full_name: string } }).user?.full_name ?? "System"} ·{" "}
              {new Date(log.created_at).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
      {logs.length === 0 && (
        <p className="text-zinc-500 pl-16">No activity recorded yet.</p>
      )}
    </div>
  );
}
