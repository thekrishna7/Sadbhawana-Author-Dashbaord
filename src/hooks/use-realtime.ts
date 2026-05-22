"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function useRealtimeTable(
  table: string,
  filter: { column: string; value: string } | null,
  onChange: () => void
) {
  useEffect(() => {
    const supabase = createClient();
    const channelName = `${table}-${filter?.value ?? "all"}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          ...(filter
            ? { filter: `${filter.column}=eq.${filter.value}` }
            : {}),
        },
        () => onChange()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, filter?.column, filter?.value, onChange]);
}
