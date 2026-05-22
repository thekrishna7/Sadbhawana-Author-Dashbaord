"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { PUBLISHING_STAGES, STAGE_COLORS } from "@/lib/constants";
import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/utils";
import type { PublishingStage } from "@/lib/types/database";
import { X, ChevronRight } from "lucide-react";

interface StageEvent {
  id: string;
  stage: string;
  notes: string | null;
  started_at: string;
  completed_at: string | null;
  assigned_staff_id: string | null;
  staff?: { full_name: string };
  items?: { id: string; title: string; content: string | null; item_type: string }[];
}

export function PublishingJourney({
  bookId,
  currentStage,
  isAdmin,
  currentUserId,
  onStageChange,
}: {
  bookId: string;
  currentStage: PublishingStage;
  isAdmin: boolean;
  currentUserId: string;
  onStageChange: () => void;
}) {
  const [events, setEvents] = useState<StageEvent[]>([]);
  const [drawerStage, setDrawerStage] = useState<string | null>(null);
  const [drawerEvent, setDrawerEvent] = useState<StageEvent | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("book_stage_events")
      .select("*, staff:profiles!book_stage_events_assigned_staff_id_fkey(full_name)")
      .eq("book_id", bookId)
      .order("started_at", { ascending: true });
    setEvents((data as StageEvent[]) ?? []);
  }, [bookId]);

  useEffect(() => {
    load();
  }, [load]);

  async function openDrawer(stageKey: string) {
    setDrawerStage(stageKey);
    let event = events.find((e) => e.stage === stageKey);
    if (!event && isAdmin) {
      const supabase = createClient();
      const { data } = await supabase
        .from("book_stage_events")
        .insert({
          book_id: bookId,
          stage: stageKey,
          created_by: currentUserId,
        })
        .select("*, staff:profiles!book_stage_events_assigned_staff_id_fkey(full_name)")
        .single();
      event = data as StageEvent;
      load();
    }
    if (event) {
      const supabase = createClient();
      const { data: items } = await supabase
        .from("stage_workflow_items")
        .select("*")
        .eq("stage_event_id", event.id);
      setDrawerEvent({ ...event, items: items ?? [] });
    }
  }

  async function advanceStage(stageKey: string) {
    if (!isAdmin) return;
    const idx = PUBLISHING_STAGES.findIndex((s) => s.key === stageKey);
    const progress = Math.round(((idx + 1) / PUBLISHING_STAGES.length) * 100);
    const supabase = createClient();
    await supabase
      .from("books")
      .update({ current_stage: stageKey, progress_percent: progress })
      .eq("id", bookId);
    onStageChange();
    load();
  }

  const currentIdx = PUBLISHING_STAGES.findIndex((s) => s.key === currentStage);

  return (
    <div className="space-y-10">
      <div className="relative">
        <div className="absolute left-0 right-0 top-8 h-0.5 bg-white/10" />
        <div className="grid grid-cols-7 gap-2 relative">
          {PUBLISHING_STAGES.map((stage, i) => {
            const active = i <= currentIdx;
            const current = stage.key === currentStage;
            return (
              <button
                key={stage.key}
                onClick={() => openDrawer(stage.key)}
                className="flex flex-col items-center gap-4 group"
              >
                <motion.div
                  className={cn(
                    "relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl border-2 text-xs font-bold transition",
                    active
                      ? `bg-gradient-to-br ${STAGE_COLORS[stage.key]} border-transparent text-white shadow-lg`
                      : "border-white/10 bg-zinc-900 text-zinc-600",
                    current && "ring-2 ring-violet-400 ring-offset-2 ring-offset-[#050508]"
                  )}
                  animate={current ? { scale: [1, 1.05, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  {i + 1}
                </motion.div>
                <span
                  className={cn(
                    "text-xs font-medium text-center max-w-[90px]",
                    active ? "text-white" : "text-zinc-600"
                  )}
                >
                  {stage.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {drawerStage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
            onClick={() => setDrawerStage(null)}
          >
            <motion.div
              initial={{ x: 400 }}
              animate={{ x: 0 }}
              exit={{ x: 400 }}
              className="h-full w-full max-w-lg glass-strong border-l border-white/10 p-10 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-white capitalize">
                    {drawerStage.replace(/_/g, " ")}
                  </h3>
                  <p className="text-zinc-500 mt-1">Workflow details</p>
                </div>
                <button onClick={() => setDrawerStage(null)} className="text-zinc-500 hover:text-white">
                  <X className="h-6 w-6" />
                </button>
              </div>

              {drawerEvent && (
                <div className="space-y-6">
                  <GlassCard hover={false} className="p-6!">
                    <p className="text-xs text-zinc-500">Started</p>
                    <p className="text-white">{new Date(drawerEvent.started_at).toLocaleString()}</p>
                    {drawerEvent.staff?.full_name && (
                      <p className="text-sm text-violet-400 mt-2">
                        Staff: {drawerEvent.staff.full_name}
                      </p>
                    )}
                    {drawerEvent.notes && (
                      <p className="text-sm text-zinc-400 mt-4">{drawerEvent.notes}</p>
                    )}
                  </GlassCard>

                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">
                      Workflow items
                    </h4>
                    {(drawerEvent.items ?? []).map((item) => (
                      <GlassCard key={item.id} hover={false} className="p-4!">
                        <p className="font-medium text-white">{item.title}</p>
                        <p className="text-xs text-zinc-500 capitalize">{item.item_type}</p>
                        {item.content && (
                          <p className="text-sm text-zinc-400 mt-2">{item.content}</p>
                        )}
                      </GlassCard>
                    ))}
                    {(drawerEvent.items ?? []).length === 0 && (
                      <p className="text-sm text-zinc-600">No notes or files for this stage yet.</p>
                    )}
                  </div>

                  {isAdmin && (
                    <button
                      onClick={() => advanceStage(drawerStage)}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 py-4 font-medium text-white hover:bg-violet-500"
                    >
                      Set as current stage <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
