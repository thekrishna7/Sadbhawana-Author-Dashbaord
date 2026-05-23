"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Lock, Mail, ArrowLeft } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";

function LoginPageContent() {
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
        "Profile not found. Please run the setup page or contact HQ to provision your account."
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

    // Log device and session history
    try {
      const ua = window.navigator.userAgent;
      const browser = /edg/i.test(ua) ? "Edge" : /chrome/i.test(ua) ? "Chrome" : /firefox/i.test(ua) ? "Firefox" : /safari/i.test(ua) ? "Safari" : "Browser";
      const os = /windows/i.test(ua) ? "Windows" : /mac/i.test(ua) ? "macOS" : /linux/i.test(ua) ? "Linux" : /android/i.test(ua) ? "Android" : /iphone|ipad/i.test(ua) ? "iOS" : "OS";

      const { data: existingProf } = await supabase
        .from("profiles")
        .select("device_login_history")
        .eq("id", authData.user.id)
        .single();

      const history = Array.isArray(existingProf?.device_login_history)
        ? existingProf.device_login_history
        : [];

      const newEntry = {
        timestamp: new Date().toISOString(),
        browser,
        os,
        ip: "Client Session"
      };

      const updatedHistory = [newEntry, ...history].slice(0, 15);

      await supabase
        .from("profiles")
        .update({
          last_login_at: new Date().toISOString(),
          device_login_history: updatedHistory
        })
        .eq("id", authData.user.id);
    } catch (err) {
      console.error("Failed to log device login history:", err);
    }

    // Role-based automatic redirection
    if (profile.role === "super_admin") {
      router.push("/admin");
    } else if (profile.role === "staff") {
      router.push("/staff");
    } else if (profile.role === "author") {
      router.push("/author");
    } else {
      router.push("/");
    }
    
    router.refresh();
  }

  return (
    <div className="ambient-bg min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decorative Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-violet-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Back to Home Link */}
      <div className="absolute top-6 left-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-zinc-500 hover:text-white transition text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Brand Experience
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-md z-10"
      >
        {/* Logo and Brand Title */}
        <div className="mb-10 text-center space-y-4">
          <div className="inline-flex justify-center mb-2">
            <Image
              src="/logo.png"
              alt="Sadbhawana Publication Logo"
              width={90}
              height={90}
              className="object-contain filter drop-shadow-[0_0_15px_rgba(139,92,246,0.25)]"
            />
          </div>
          <div>
            <h2 className="text-3xl font-black tracking-tight text-gradient font-serif">
              Sadbhawana Publication
            </h2>
            <p className="text-sm font-bold tracking-[0.25em] text-amber-500/90 uppercase mt-2">
              Author Dashboard Login
            </p>
            <p className="text-zinc-500 text-xs mt-1">
              Official internal publishing portal
            </p>
          </div>
        </div>

        {/* Login Form Container */}
        <div className="glass-strong rounded-3xl p-8 glow-violet border border-white/5 space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">Welcome back</h3>
            <p className="text-xs text-zinc-500">
              Please enter your credentials to access your dashboard.
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-xs text-red-400 font-medium"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-[#07070b]/60 py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/10 transition-all font-medium"
                  placeholder="name@sadbhawana.com"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-[#07070b]/60 py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/10 transition-all font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 py-3.5 text-sm font-bold text-white transition hover:from-violet-500 hover:to-purple-500 disabled:opacity-50 shadow-lg shadow-violet-950/50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Verifying Access...
                </>
              ) : (
                "Verify and Sign In"
              )}
            </button>
          </form>

          <p className="text-center text-[10px] text-zinc-600 font-medium">
            Protected luxury ecosystem. Accounts are provisioned exclusively by HQ.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="ambient-bg min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  );
}
