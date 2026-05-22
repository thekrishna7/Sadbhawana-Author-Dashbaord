"use client";

import { useState } from "react";
import Link from "next/link";

export default function SetupPage() {
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    setup_secret: "",
  });
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/setup/super-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult(`Error: ${data.error}`);
      } else {
        setResult(`Success! Sign in at /login with ${data.email}`);
      }
    } catch (err) {
      setResult(`Failed: ${err instanceof Error ? err.message : "Network error"}`);
    }
    setLoading(false);
  }

  return (
    <div className="ambient-bg min-h-screen flex items-center justify-center p-10">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gradient">First-time setup</h1>
          <p className="text-zinc-500">Create your Super Admin account (once only)</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-strong rounded-3xl p-10 space-y-5">
          <p className="text-sm text-amber-400/90 bg-amber-500/10 rounded-xl p-4">
            Add <code className="text-violet-300">SUPABASE_SERVICE_ROLE_KEY</code> and{" "}
            <code className="text-violet-300">SETUP_SECRET</code> to your{" "}
            <code className="text-violet-300">.env.local</code> file, then restart{" "}
            <code className="text-violet-300">npm run dev</code>.
          </p>

          <input
            required
            placeholder="Full name"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
            value={form.full_name}
            onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
          />
          <input
            required
            type="email"
            placeholder="Email"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <input
            required
            type="password"
            minLength={8}
            placeholder="Password (min 8 chars)"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          />
          <input
            required
            placeholder="SETUP_SECRET from .env.local"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
            value={form.setup_secret}
            onChange={(e) => setForm((f) => ({ ...f, setup_secret: e.target.value }))}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-violet-600 py-4 font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
          >
            {loading ? "Creating…" : "Create Super Admin"}
          </button>

          {result && (
            <p className={`text-sm ${result.startsWith("Success") ? "text-emerald-400" : "text-red-400"}`}>
              {result}
            </p>
          )}
        </form>

        <p className="text-center text-sm text-zinc-600">
          <Link href="/" className="text-violet-400 hover:text-violet-300">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
