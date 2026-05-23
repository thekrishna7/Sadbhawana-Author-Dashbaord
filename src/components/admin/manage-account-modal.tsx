"use client";

import { useState, useEffect } from "react";
import { motion as motionFramer, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/toast";
import {
  X,
  User,
  Mail,
  Lock,
  ShieldAlert,
  History,
  Trash2,
  Loader2,
  Unlock,
  Ban,
  Activity,
  CheckCircle2
} from "lucide-react";
import type { Profile } from "@/lib/types/database";

// Custom type representing the parsed history entry
interface LoginHistoryEntry {
  timestamp: string;
  browser: string;
  os: string;
  ip: string;
}

const STATUS_CONFIGS: Record<string, { label: string; class: string; icon: any }> = {
  active: { label: "Active", class: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5", icon: CheckCircle2 },
  suspended: { label: "Suspended", class: "text-red-400 border-red-500/20 bg-red-500/5", icon: Ban },
  locked: { label: "Locked", class: "text-pink-400 border-pink-500/20 bg-pink-500/5", icon: Lock },
  disabled: { label: "Disabled", class: "text-zinc-400 border-white/5 bg-white/2", icon: X },
  pending: { label: "Pending Verification", class: "text-amber-400 border-amber-500/20 bg-amber-500/5", icon: ShieldAlert },
};

export function ManageAccountModal({
  open,
  onClose,
  profile,
  onUpdate
}: {
  open: boolean;
  onClose: () => void;
  profile: Profile & { device_login_history?: any[] | null; last_login_at?: string | null };
  onUpdate: () => void;
}) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<"credentials" | "status" | "logs" | "danger">("credentials");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form states
  const [email, setEmail] = useState(profile.email || "");
  const [password, setPassword] = useState("");
  const [confirmDeleteName, setConfirmDeleteName] = useState("");

  useEffect(() => {
    setEmail(profile.email || "");
    setPassword("");
    setConfirmDeleteName("");
    setActiveTab("credentials");
  }, [profile, open]);

  async function handleAdminAction(action: "update-email" | "update-password" | "update-status" | "terminate-sessions", payload: any = {}) {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/manage-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: profile.id,
          action,
          payload
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Failed to execute action ${action}`);
      }

      toast.success("Account updated successfully.");
      onUpdate();
      if (action === "update-password") setPassword("");
    } catch (err: any) {
      toast.error(err.message || "Operation failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteUser() {
    if (confirmDeleteName !== profile.full_name) {
      toast.error("Please type the user's full name to confirm deletion.");
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profile.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete user");

      toast.success(`Account for "${profile.full_name}" has been permanently deleted.`);
      onUpdate();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete user account.");
    } finally {
      setDeleting(false);
    }
  }

  const loginHistory: LoginHistoryEntry[] = Array.isArray(profile.device_login_history)
    ? (profile.device_login_history as LoginHistoryEntry[])
    : [];

  const CurrentStatusIcon = STATUS_CONFIGS[profile.status]?.icon || ShieldAlert;

  return (
    <AnimatePresence>
      {open && (
        <motionFramer.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          onClick={onClose}
        >
          <motionFramer.div
            initial={{ scale: 0.95, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 8 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 shadow-2xl backdrop-blur-xl flex flex-col max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/5 bg-zinc-950/95 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center font-bold text-violet-400">
                  {profile.full_name ? profile.full_name.charAt(0) : "U"}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    {profile.full_name}
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      STATUS_CONFIGS[profile.status]?.class || "text-zinc-400 border-white/5"
                    } flex items-center gap-1`}>
                      <CurrentStatusIcon className="h-3 w-3 shrink-0" />
                      {STATUS_CONFIGS[profile.status]?.label || profile.status}
                    </span>
                  </h3>
                  <p className="text-[11px] text-zinc-500 capitalize">{profile.role} · ID: {profile.id.substring(0, 8)}...</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-full bg-white/5 p-1.5 text-zinc-400 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body Grid */}
            <div className="flex-1 overflow-y-auto grid md:grid-cols-[180px_1fr] min-h-[350px]">
              {/* Sidebar Tabs */}
              <div className="border-r border-white/5 bg-zinc-900/10 p-4 flex flex-col gap-1.5 shrink-0">
                <button
                  onClick={() => setActiveTab("credentials")}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition ${
                    activeTab === "credentials"
                      ? "bg-violet-600/15 text-violet-200 border border-violet-500/25"
                      : "text-zinc-500 hover:bg-white/5 hover:text-white border border-transparent"
                  }`}
                >
                  <Mail className="h-4 w-4 shrink-0" /> Credentials
                </button>
                <button
                  onClick={() => setActiveTab("status")}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition ${
                    activeTab === "status"
                      ? "bg-violet-600/15 text-violet-200 border border-violet-500/25"
                      : "text-zinc-500 hover:bg-white/5 hover:text-white border border-transparent"
                  }`}
                >
                  <Ban className="h-4 w-4 shrink-0" /> Access & Status
                </button>
                <button
                  onClick={() => setActiveTab("logs")}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition ${
                    activeTab === "logs"
                      ? "bg-violet-600/15 text-violet-200 border border-violet-500/25"
                      : "text-zinc-500 hover:bg-white/5 hover:text-white border border-transparent"
                  }`}
                >
                  <History className="h-4 w-4 shrink-0" /> Session Logs
                </button>
                <button
                  onClick={() => setActiveTab("danger")}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition ${
                    activeTab === "danger"
                      ? "bg-red-500/10 text-red-400 border border-red-500/25"
                      : "text-zinc-500 hover:bg-white/5 hover:text-red-400 border border-transparent"
                  }`}
                >
                  <Trash2 className="h-4 w-4 shrink-0" /> Danger Zone
                </button>
              </div>

              {/* Tab Contents */}
              <div className="p-6">
                <AnimatePresence mode="wait">
                  {activeTab === "credentials" && (
                    <motionFramer.div
                      key="credentials"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="space-y-6"
                    >
                      {/* Email override */}
                      <div className="space-y-3">
                        <div>
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Change registered email</h4>
                          <p className="text-[11px] text-zinc-500 mt-0.5">Admin-controlled email update. Instantly updates auth login credentials.</p>
                        </div>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-xs text-white focus:outline-none focus:border-violet-500"
                          />
                        </div>
                        <button
                          type="button"
                          disabled={loading || email === profile.email}
                          onClick={() => handleAdminAction("update-email", { email })}
                          className="rounded-xl bg-violet-600 px-4 py-2.5 text-[11px] font-bold text-white hover:bg-violet-500 disabled:opacity-50 transition"
                        >
                          {loading ? "Updating Email..." : "Update Email Address"}
                        </button>
                      </div>

                      {/* Password override */}
                      <div className="space-y-3 border-t border-white/5 pt-5">
                        <div>
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Reset password</h4>
                          <p className="text-[11px] text-zinc-500 mt-0.5">Set a new password for the user. Bypasses confirmation emails.</p>
                        </div>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
                          <input
                            type="text"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="New password (min 8 chars)"
                            className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-xs text-white focus:outline-none focus:border-violet-500"
                          />
                        </div>
                        <button
                          type="button"
                          disabled={loading || password.length < 8}
                          onClick={() => handleAdminAction("update-password", { password })}
                          className="rounded-xl bg-violet-600 px-4 py-2.5 text-[11px] font-bold text-white hover:bg-violet-500 disabled:opacity-50 transition"
                        >
                          {loading ? "Resetting Password..." : "Override Password"}
                        </button>
                      </div>
                    </motionFramer.div>
                  )}

                  {activeTab === "status" && (
                    <motionFramer.div
                      key="status"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="space-y-6"
                    >
                      {/* Change Status state */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Configure account status</h4>
                          <p className="text-[11px] text-zinc-500 mt-0.5">Set user state. Banned states (Suspended, Locked, Disabled) restrict portal access.</p>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {(["active", "suspended", "locked", "disabled", "pending"] as const).map((status) => {
                            const config = STATUS_CONFIGS[status];
                            const Icon = config.icon;
                            const isCurrent = profile.status === status;
                            return (
                              <button
                                key={status}
                                type="button"
                                disabled={loading || isCurrent}
                                onClick={() => handleAdminAction("update-status", { status })}
                                className={`rounded-xl border p-3 flex flex-col items-center gap-1.5 transition ${
                                  isCurrent
                                    ? "border-violet-500 bg-violet-500/10 text-white font-bold"
                                    : "border-white/5 bg-white/2 text-zinc-400 hover:border-white/10 hover:text-white"
                                } disabled:opacity-80`}
                              >
                                <Icon className="h-4 w-4" />
                                <span className="text-[10px] uppercase font-bold tracking-wider">{config.label.split(" ")[0]}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Terminate Session */}
                      <div className="border-t border-white/5 pt-5 space-y-3">
                        <div>
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Terminate sessions</h4>
                          <p className="text-[11px] text-zinc-500 mt-0.5">Force sign out this user from all active browser tabs and devices.</p>
                        </div>
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => handleAdminAction("terminate-sessions")}
                          className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2.5 text-[11px] font-bold text-red-400 hover:bg-red-500/25 transition disabled:opacity-50 flex items-center gap-1.5"
                        >
                          <Activity className="h-3.5 w-3.5" />
                          {loading ? "Terminating..." : "Sign Out From All Devices"}
                        </button>
                      </div>
                    </motionFramer.div>
                  )}

                  {activeTab === "logs" && (
                    <motionFramer.div
                      key="logs"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="space-y-4"
                    >
                      <div>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">Device & session history</h4>
                        <p className="text-[11px] text-zinc-500 mt-0.5">Logs of recent logins. Tracks browser user-agent signatures.</p>
                      </div>

                      {loginHistory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-8 border border-white/5 rounded-2xl bg-white/2 text-zinc-600 text-xs">
                          <History className="h-6 w-6 text-zinc-700 mb-2" />
                          No login events recorded for this user.
                        </div>
                      ) : (
                        <div className="border border-white/5 rounded-2xl overflow-hidden bg-white/2">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="border-b border-white/5 bg-zinc-950/40 text-zinc-500 font-bold uppercase tracking-wider">
                                <th className="p-3">Time</th>
                                <th className="p-3">OS</th>
                                <th className="p-3">Browser</th>
                                <th className="p-3">Method</th>
                              </tr>
                            </thead>
                            <tbody>
                              {loginHistory.map((item, index) => (
                                <tr key={index} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                                  <td className="p-3 text-zinc-300 font-medium">
                                    {new Date(item.timestamp).toLocaleString()}
                                  </td>
                                  <td className="p-3 text-zinc-400">{item.os}</td>
                                  <td className="p-3 text-zinc-400">{item.browser}</td>
                                  <td className="p-3 text-zinc-500">{item.ip}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </motionFramer.div>
                  )}

                  {activeTab === "danger" && (
                    <motionFramer.div
                      key="danger"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="space-y-5"
                    >
                      <div className="rounded-xl border border-red-500/20 bg-red-950/15 p-4 flex gap-3">
                        <ShieldAlert className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider">Permanent deletion</h4>
                          <p className="text-[11px] text-red-300 leading-relaxed">
                            Deleting this account removes their profile data, books assignment, royalty balance sheets, cover briefs, and message correspondence. This operation is non-reversible.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3 pt-2">
                        <label className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider block">
                          Type user name <span className="text-white font-semibold">"{profile.full_name}"</span> to confirm:
                        </label>
                        <input
                          type="text"
                          value={confirmDeleteName}
                          onChange={(e) => setConfirmDeleteName(e.target.value)}
                          placeholder="Confirm user name"
                          className="w-full rounded-2xl border border-red-500/20 bg-red-900/5 px-4 py-3 text-xs text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/30"
                        />
                      </div>

                      <button
                        type="button"
                        disabled={deleting || confirmDeleteName !== profile.full_name}
                        onClick={handleDeleteUser}
                        className="rounded-xl bg-red-600 px-5 py-3 text-xs font-bold text-white hover:bg-red-500 disabled:opacity-50 transition flex items-center justify-center gap-2 shadow-lg shadow-red-950/20 w-full"
                      >
                        {deleting && <Loader2 className="h-3 w-3 animate-spin" />}
                        Permanently Delete Account
                      </button>
                    </motionFramer.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motionFramer.div>
        </motionFramer.div>
      )}
    </AnimatePresence>
  );
}
