"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/types/database";
import { Loader2, Lock, Mail } from "lucide-react";

export function LoginForm({
  expectedRole,
  title,
  subtitle,
  redirectTo,
}: {
  expectedRole: UserRole;
  title: string;
  subtitle: string;
  redirectTo: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "suspended"
      ? "Your account has been suspended. Contact HQ."
      : null
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", authData.user.id)
      .single();

    if (!profile) {
      setError(
        "Profile not found. Run /setup to create Super Admin, or ask HQ to provision your account."
      );
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    if (profile.status === "suspended") {
      setError("Your account has been suspended.");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    if (profile.role !== expectedRole && profile.role !== "super_admin") {
      setError(`This portal is for ${expectedRole.replace("_", " ")} accounts only.`);
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md"
    >
      <div className="mb-10 space-y-3 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-gradient">{title}</h1>
        <p className="text-lg text-zinc-500">{subtitle}</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="glass-strong space-y-6 rounded-3xl p-10 glow-violet"
      >
        {error && (
          <div className="rounded-2xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-400">Email</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 py-4 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              placeholder="you@company.com"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-400">Password</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 py-4 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              placeholder="••••••••"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 py-4 text-lg font-semibold text-white transition hover:from-violet-500 hover:to-purple-500 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Sign in"}
        </button>

        <p className="text-center text-xs text-zinc-600">
          No public registration. Accounts are provisioned by HQ.
        </p>
      </form>
    </motion.div>
  );
}
