"use client";

import React, { useState, useEffect, useRef } from "react";
import { Bell, Check, Mail, Inbox, Trash2, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Notification } from "@/lib/types/database";
import { useToast } from "@/components/ui/toast";
import { DeveloperMailbox } from "./developer-mailbox";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

export function NotificationBell({ profile }: { profile: Profile }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mailboxOpen, setMailboxOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const supabase = createClient();

  // Load initial notifications
  async function loadNotifications() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) throw error;
      setNotifications(data || []);
      setUnreadCount((data || []).filter((n) => !n.read).length);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  }

  // Subscribe to real-time changes
  useEffect(() => {
    loadNotifications();

    const channel = supabase
      .channel(`notifications-realtime-${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => [newNotif, ...prev]);
          setUnreadCount((prev) => prev + 1);

          // Show rich toast alert
          if (newNotif.type === "critical" || newNotif.type === "warning") {
            toast.error(`[CRITICAL] ${newNotif.title}: ${newNotif.body}`);
          } else {
            toast.info(`${newNotif.title}`);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          const updated = payload.new as Notification;
          setNotifications((prev) =>
            prev.map((n) => (n.id === updated.id ? updated : n))
          );
          // Recalculate unread count
          setNotifications((prev) => {
            setUnreadCount(prev.filter((n) => !n.read).length);
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function markAsRead(id: string) {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", id);

      if (error) throw error;
      
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  }

  async function markAllAsRead() {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", profile.id)
        .eq("read", false);

      if (error) throw error;

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-300"
      >
        <Bell className={`h-5 w-5 ${unreadCount > 0 ? "animate-pulse" : ""}`} />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white shadow-lg border border-zinc-950"
            >
              {unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-[-10px] sm:right-0 mt-3 w-[calc(100vw-32px)] sm:w-96 origin-top-right rounded-2xl border border-white/10 bg-zinc-950/95 p-2 shadow-2xl backdrop-blur-xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <span className="text-sm font-bold text-white">Notifications</span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 font-medium transition"
                >
                  <Check className="h-3 w-3" /> Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-[360px] overflow-y-auto py-2 space-y-1">
              {loading && notifications.length === 0 ? (
                <div className="py-4 px-2 space-y-2.5 animate-pulse">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-xl border border-white/5 bg-white/2 p-3.5 space-y-2">
                      <Skeleton className="h-3.5 w-24 rounded shimmer" />
                      <Skeleton className="h-3 w-48 rounded shimmer" />
                      <Skeleton className="h-2 w-16 rounded shimmer" />
                    </div>
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="relative py-12 flex flex-col items-center justify-center text-center overflow-hidden">
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 h-24 w-24 rounded-full blur-3xl bg-violet-500/10" />
                  <div className="relative z-10 w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-3">
                    <Inbox className="h-6 w-6 text-zinc-500" />
                  </div>
                  <p className="text-sm font-semibold text-zinc-300 relative z-10">Inbox is empty</p>
                  <p className="text-[11px] text-zinc-500 mt-1 max-w-[220px] leading-relaxed relative z-10">
                    You are all caught up! Realtime logs and alerts will appear here.
                  </p>
                </div>
              ) : (
                notifications.map((notif) => {
                  const isCritical = notif.type === "critical" || notif.type === "warning";
                  return (
                    <div
                      key={notif.id}
                      className={`group relative rounded-xl p-3.5 mx-1 transition border ${
                        notif.read
                          ? "bg-transparent border-transparent text-zinc-400 hover:bg-white/2"
                          : isCritical
                          ? "bg-red-500/5 border-red-500/15 text-white"
                          : "bg-violet-500/5 border-violet-500/10 text-white"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {!notif.read && (
                              <span className="h-1.5 w-1.5 rounded-full bg-violet-500 shrink-0" />
                            )}
                            {isCritical && (
                              <ShieldAlert className="h-3.5 w-3.5 text-red-400 shrink-0" />
                            )}
                            <p className="text-xs font-bold truncate leading-tight">
                              {notif.title}
                            </p>
                          </div>
                          <p className="text-[11px] mt-1 text-zinc-400 leading-relaxed font-normal">
                            {notif.body}
                          </p>
                          {notif.link && (
                            <Link
                              href={notif.link}
                              onClick={() => {
                                markAsRead(notif.id);
                                setIsOpen(false);
                              }}
                              className="inline-block mt-2 text-[10px] font-bold text-violet-400 hover:text-violet-300 underline underline-offset-2 transition"
                            >
                              View details →
                            </Link>
                          )}
                          <p className="text-[9px] text-zinc-600 mt-2">
                            {new Date(notif.created_at).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>

                        {!notif.read && (
                          <button
                            onClick={() => markAsRead(notif.id)}
                            className="opacity-0 group-hover:opacity-100 rounded-lg p-1 text-zinc-500 hover:text-white hover:bg-white/5 transition shrink-0"
                            title="Mark as read"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer / Mailbox simulator */}
            <div className="p-2 border-t border-white/5 bg-zinc-950/40">
              <button
                onClick={() => {
                  setIsOpen(false);
                  setMailboxOpen(true);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/5 bg-white/2 hover:bg-white/5 hover:border-white/10 px-4 py-2.5 text-xs font-semibold text-zinc-400 hover:text-white transition"
              >
                <Mail className="h-3.5 w-3.5" />
                Developer Mailbox Simulator
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Simulator Drawer */}
      <DeveloperMailbox isOpen={mailboxOpen} onClose={() => setMailboxOpen(false)} />
    </div>
  );
}
