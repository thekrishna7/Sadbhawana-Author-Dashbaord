"use client";

import { useEffect, useState, useCallback } from "react";
import { AuthorShell } from "@/components/layout/author-shell";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Notification } from "@/lib/types/database";
import { Bell, Loader2, CheckCheck, Inbox, ShieldAlert } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function AuthorNotificationsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const loadNotifications = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Load Profile
    const { data: p } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    setProfile(p as Profile);

    // Load Notifications
    const { data: n } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setNotifications((n as Notification[]) ?? []);
    setLoading(false);

    // Mark unread notifications as read when viewing page
    const unreadIds = (n as Notification[])?.filter((item) => !item.read).map((item) => item.id) ?? [];
    if (unreadIds.length > 0) {
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false);
    }
  }, [supabase]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkAllRead = async () => {
    if (!profile) return;
    try {
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", profile.id)
        .eq("read", false);
      
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const getNotificationIconColor = (type: string) => {
    switch (type) {
      case "royalty_credited":
      case "royalty_payout":
        return "text-emerald-400 bg-emerald-500/10";
      case "manuscript_uploaded":
      case "document_uploaded":
        return "text-amber-500 bg-amber-500/10";
      case "cover_approved":
      case "cover_uploaded":
        return "text-purple-400 bg-purple-500/10";
      default:
        return "text-zinc-400 bg-zinc-500/10";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030303] text-zinc-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  const hasUnread = notifications.some((n) => !n.read);

  return (
    <AuthorShell title="Notifications">
      <div className="space-y-6 flex-grow flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center shrink-0">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white font-serif">Inbox</h2>
            <p className="text-xs text-zinc-500">Your publishing activity updates.</p>
          </div>

          {hasUnread && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 text-xs font-bold text-amber-500 hover:text-amber-400 transition"
            >
              <CheckCheck className="h-4 w-4" /> Mark all read
            </button>
          )}
        </div>

        {/* Notifications Feed */}
        <div className="space-y-3 flex-grow overflow-y-auto pr-1">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4.5 rounded-2xl border transition-all duration-300 flex gap-4 ${
                n.read 
                  ? "bg-[#09090b]/40 border-white/5 opacity-70" 
                  : "bg-[#09090b]/80 border-amber-500/10 relative overflow-hidden"
              }`}
            >
              {/* Unread indicator bar */}
              {!n.read && (
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-amber-500" />
              )}

              <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${getNotificationIconColor(n.type)}`}>
                <Bell className="h-4 w-4" />
              </div>

              <div className="space-y-1 min-w-0 flex-grow">
                <div className="flex justify-between items-start gap-2">
                  <h3 className={`text-xs font-bold leading-snug truncate ${n.read ? "text-zinc-300" : "text-white"}`}>
                    {n.title}
                  </h3>
                  <span className="text-[9px] text-zinc-500 whitespace-nowrap shrink-0">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true }).replace("about ", "")}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed break-words font-medium">
                  {n.body}
                </p>
              </div>
            </div>
          ))}

          {notifications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-500 text-center space-y-3 flex-grow">
              <Inbox className="h-10 w-10 text-zinc-700" />
              <p className="text-sm font-semibold">Workspace is quiet</p>
              <p className="text-xs text-zinc-600 max-w-[240px]">
                You have no notifications right now. Activity logs from HQ will appear here.
              </p>
            </div>
          )}
        </div>
      </div>
    </AuthorShell>
  );
}
