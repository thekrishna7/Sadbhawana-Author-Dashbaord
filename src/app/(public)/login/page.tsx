"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Lock, Mail, ArrowLeft, Phone, CheckCircle2, KeyRound, ShieldAlert } from "lucide-react";
import Image from "next/image";
import { Suspense } from "react";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Authentication states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "suspended"
      ? "Your account has been suspended. Contact HQ."
      : null
  );
  const [loading, setLoading] = useState(false);

  // Forgot password flow states
  // Modes: "login" | "forgot_email" | "forgot_otp" | "forgot_reset" | "forgot_success"
  const [mode, setMode] = useState<"login" | "forgot_email" | "forgot_otp" | "forgot_reset" | "forgot_success">("login");
  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [forgotEmail, setForgotEmail] = useState(""); // resolved email from server
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotResetToken, setForgotResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Main login submit
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
      setError("Profile not found. Please contact HQ.");
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

    // Redirection
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

  // Forgot password helper calls
  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send-otp", identifier: forgotIdentifier }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to request code");
      }

      setForgotEmail(data.email);
      setMode("forgot_otp");
      setCountdown(60);
    } catch (err: any) {
      setForgotError(err.message || "An error occurred");
    } finally {
      setForgotLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify-otp", email: forgotEmail, otp: forgotOtp }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to verify code");
      }

      setForgotResetToken(data.resetToken);
      setMode("forgot_reset");
    } catch (err: any) {
      setForgotError(err.message || "An error occurred");
    } finally {
      setForgotLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setForgotError("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setForgotError("Password must be at least 6 characters long");
      return;
    }

    setForgotLoading(true);
    setForgotError(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset-password",
          email: forgotEmail,
          token: forgotResetToken,
          password: newPassword,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update password");
      }

      setMode("forgot_success");
    } catch (err: any) {
      setForgotError(err.message || "An error occurred");
    } finally {
      setForgotLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative Gold Subtle Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-zinc-900/40 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md z-10 space-y-8"
      >
        {/* Brand Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex justify-center">
            <Image
              src="/logo.png"
              alt="Sadbhawana Logo"
              width={70}
              height={70}
              priority
              className="object-contain filter drop-shadow-[0_0_12px_rgba(245,158,11,0.2)]"
            />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-white font-serif">
              Sadbhawana Publication
            </h2>
            <p className="text-[10px] font-bold tracking-[0.2em] text-amber-500 uppercase">
              Logi Your Author's Dashbaord
            </p>
          </div>
        </div>

        {/* Dynamic Card Container */}
        <div className="bg-[#09090b] rounded-[28px] border border-white/5 p-8 shadow-2xl relative overflow-hidden group hover:border-amber-500/10 transition-all duration-500">
          {/* Subtle Accent Glow Border */}
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />

          <AnimatePresence mode="wait">
            {/* 1. LOGIN SCREEN */}
            {mode === "login" && (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white">Welcome Back</h3>
                  <p className="text-xs text-zinc-500">
                    Sign in to access your secure publishing workspace.
                  </p>
                </div>

                {error && (
                  <div className="rounded-2xl bg-red-500/5 border border-red-500/15 p-3.5 text-xs text-red-400 font-medium flex gap-2.5 items-start">
                    <ShieldAlert className="h-4 w-4 shrink-0 text-red-400" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-black/40 py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-zinc-600 focus:border-amber-500/30 focus:outline-none transition-all"
                        placeholder="name@sadbhawana.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setMode("forgot_email");
                          setForgotError(null);
                        }}
                        className="text-xs font-semibold text-amber-500 hover:text-amber-400 transition"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-black/40 py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-zinc-600 focus:border-amber-500/30 focus:outline-none transition-all"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white hover:bg-zinc-200 py-3.5 text-sm font-bold text-black transition disabled:opacity-50 shadow-lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Verifying Workspace...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </button>
                </form>
              </motion.div>
            )}

            {/* 2. FORGOT PASSWORD: REQUEST OTP */}
            {mode === "forgot_email" && (
              <motion.div
                key="forgot_email"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white">Reset Password</h3>
                  <p className="text-xs text-zinc-500">
                    Enter the email address or phone linked to your workspace. We will send you an OTP verification code.
                  </p>
                </div>

                {forgotError && (
                  <div className="rounded-2xl bg-red-500/5 border border-red-500/15 p-3.5 text-xs text-red-400 font-medium flex gap-2.5 items-start">
                    <ShieldAlert className="h-4 w-4 shrink-0 text-red-400" />
                    <span>{forgotError}</span>
                  </div>
                )}

                <form onSubmit={handleRequestOtp} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Email or Phone
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                      <input
                        type="text"
                        required
                        value={forgotIdentifier}
                        onChange={(e) => setForgotIdentifier(e.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-black/40 py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-zinc-600 focus:border-amber-500/30 focus:outline-none transition-all"
                        placeholder="author@sadbhawana.com or +91..."
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white hover:bg-zinc-200 py-3.5 text-sm font-bold text-black transition disabled:opacity-50"
                  >
                    {forgotLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Sending Code...
                      </>
                    ) : (
                      "Send Verification Code"
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setForgotError(null);
                    }}
                    className="flex items-center justify-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition w-full py-2"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
                  </button>
                </form>
              </motion.div>
            )}

            {/* 3. FORGOT PASSWORD: VERIFY OTP */}
            {mode === "forgot_otp" && (
              <motion.div
                key="forgot_otp"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white">Enter OTP</h3>
                  <p className="text-xs text-zinc-500">
                    We sent a security code to <strong className="text-zinc-200">{forgotEmail}</strong>. Please enter the 6-digit code below.
                  </p>
                </div>

                {forgotError && (
                  <div className="rounded-2xl bg-red-500/5 border border-red-500/15 p-3.5 text-xs text-red-400 font-medium flex gap-2.5 items-start">
                    <ShieldAlert className="h-4 w-4 shrink-0 text-red-400" />
                    <span>{forgotError}</span>
                  </div>
                )}

                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Verification Code
                    </label>
                    <div className="relative">
                      <KeyRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                      <input
                        type="text"
                        required
                        maxLength={6}
                        pattern="\d{6}"
                        value={forgotOtp}
                        onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ""))}
                        className="w-full rounded-2xl border border-white/10 bg-black/40 py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-zinc-600 focus:border-amber-500/30 focus:outline-none transition-all tracking-[0.4em] font-mono text-center font-bold"
                        placeholder="000000"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs text-zinc-500 px-1">
                    <span>Didn't receive the email?</span>
                    {countdown > 0 ? (
                      <span className="text-zinc-400 font-medium">Resend in {countdown}s</span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleRequestOtp}
                        className="font-bold text-amber-500 hover:text-amber-400 transition"
                      >
                        Resend Code
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={forgotLoading || forgotOtp.length !== 6}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white hover:bg-zinc-200 py-3.5 text-sm font-bold text-black transition disabled:opacity-50"
                  >
                    {forgotLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Verifying...
                      </>
                    ) : (
                      "Verify OTP"
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMode("forgot_email");
                      setForgotError(null);
                      setForgotOtp("");
                    }}
                    className="flex items-center justify-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition w-full py-2"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Back
                  </button>
                </form>
              </motion.div>
            )}

            {/* 4. FORGOT PASSWORD: SET NEW PASSWORD */}
            {mode === "forgot_reset" && (
              <motion.div
                key="forgot_reset"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white">New Password</h3>
                  <p className="text-xs text-zinc-500">
                    Define a secure, strong password for your workspace.
                  </p>
                </div>

                {forgotError && (
                  <div className="rounded-2xl bg-red-500/5 border border-red-500/15 p-3.5 text-xs text-red-400 font-medium flex gap-2.5 items-start">
                    <ShieldAlert className="h-4 w-4 shrink-0 text-red-400" />
                    <span>{forgotError}</span>
                  </div>
                )}

                <form onSubmit={handleResetPassword} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-black/40 py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-zinc-600 focus:border-amber-500/30 focus:outline-none transition-all"
                        placeholder="Min 6 characters"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-black/40 py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-zinc-600 focus:border-amber-500/30 focus:outline-none transition-all"
                        placeholder="Re-enter password"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={forgotLoading || !newPassword || !confirmPassword}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white hover:bg-zinc-200 py-3.5 text-sm font-bold text-black transition disabled:opacity-50"
                  >
                    {forgotLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Updating...
                      </>
                    ) : (
                      "Set New Password"
                    )}
                  </button>
                </form>
              </motion.div>
            )}

            {/* 5. FORGOT PASSWORD: SUCCESS ANIMATION STATE */}
            {mode === "forgot_success" && (
              <motion.div
                key="forgot_success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6 space-y-6"
              >
                <div className="flex justify-center">
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", damping: 15, stiffness: 200 }}
                    className="h-16 w-16 bg-amber-500/10 rounded-full border border-amber-500/30 flex items-center justify-center text-amber-500"
                  >
                    <CheckCircle2 className="h-8 w-8 text-amber-400" />
                  </motion.div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-white">Password Updated</h3>
                  <p className="text-xs text-zinc-500 px-4">
                    Your password has been changed successfully. You can now use your new password to sign in.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setMode("login");
                    setForgotError(null);
                    setForgotIdentifier("");
                    setForgotEmail("");
                    setForgotOtp("");
                    setForgotResetToken("");
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                  className="w-full rounded-2xl bg-white hover:bg-zinc-200 py-3.5 text-sm font-bold text-black transition"
                >
                  Go to Sign In
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-[10px] text-zinc-600 font-medium">
          Protected Luxury Workspace. Accounts are authorized exclusively by Sadbhawana Publication.
        </p>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#030303] flex items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  );
}
