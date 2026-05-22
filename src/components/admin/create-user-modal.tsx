"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export function CreateUserModal({
  open,
  onClose,
  onCreated,
  defaultRole = "author",
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  defaultRole?: "author" | "staff";
}) {
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    role: defaultRole,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed");
      setLoading(false);
      return;
    }
    onCreated();
    onClose();
    setLoading(false);
    setForm({ email: "", password: "", full_name: "", role: defaultRole });
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-10"
          onClick={onClose}
        >
          <motion.form
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            onSubmit={submit}
            className="glass-strong w-full max-w-lg rounded-3xl p-10 space-y-6"
          >
            <div className="flex justify-between">
              <h2 className="text-2xl font-bold text-white">Create account</h2>
              <button type="button" onClick={onClose} className="text-zinc-500">
                <X />
              </button>
            </div>
            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 rounded-xl px-4 py-2">{error}</p>
            )}
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
              placeholder="Temporary password"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
            <select
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
              value={form.role}
              onChange={(e) =>
                setForm((f) => ({ ...f, role: e.target.value as "author" | "staff" }))
              }
            >
              <option value="author">Author</option>
              <option value="staff">Staff</option>
            </select>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-violet-600 py-4 font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
            >
              {loading ? "Creating…" : "Create user"}
            </button>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
