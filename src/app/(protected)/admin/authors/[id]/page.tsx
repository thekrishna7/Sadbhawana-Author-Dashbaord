"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { GlassCard } from "@/components/ui/glass-card";
import { useToast } from "@/components/ui/toast";
import { useRouter, useParams } from "next/navigation";
import { Loader2, ArrowLeft, Save, User, Mail, Phone } from "lucide-react";
import Link from "next/link";

export default function AdminAuthorEditPage() {
  const params = useParams();
  const id = params.id as string;

  const [author, setAuthor] = useState<any | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const supabase = createClient();
  const toast = useToast();
  const router = useRouter();

  const loadData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      if (data) {
        setAuthor(data);
        setName(data.full_name || "");
        setEmail(data.email || "");
        setPhone(data.phone || "");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load author details.");
      router.push("/admin/authors");
    } finally {
      setLoading(false);
    }
  }, [id, supabase, router, toast]);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id, loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // 1. Update profiles table
      const { error: dbErr } = await supabase
        .from("profiles")
        .update({
          full_name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
        })
        .eq("id", id);

      if (dbErr) throw dbErr;

      // 2. Also update auth.users via admin if email is different?
      // Since it's done client-side by admin, direct auth.users update might fail due to security.
      // But updating the profile record is primary for sync. We can log activity too.
      await supabase.from("activity_logs").insert({
        user_id: (await supabase.auth.getUser()).data.user?.id || null,
        action: "author_profile_updated",
        entity_type: "profile",
        metadata: { target_author: id, name, email, phone },
      });

      toast.success("Author details updated successfully.");
      router.push("/admin/authors");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update author details.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030303] text-zinc-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <DashboardShell title="Edit Author">
      <div className="space-y-6 max-w-md mx-auto w-full">
        {/* Back Link */}
        <Link href="/admin/authors" className="inline-flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-white uppercase tracking-wider transition-all">
          <ArrowLeft className="h-4 w-4" /> Back to Authors
        </Link>

        {/* Author Header Card */}
        <GlassCard className="p-6 flex items-center gap-4" hover={false} glow>
          {author.avatar_url ? (
            <div className="h-14 w-14 rounded-full overflow-hidden relative shrink-0">
              <img src={author.avatar_url} alt="" className="object-cover h-14 w-14" />
            </div>
          ) : (
            <div className="h-14 w-14 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-lg font-bold text-amber-500 shrink-0 font-serif">
              {author.full_name?.charAt(0) || "A"}
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-white font-serif tracking-tight leading-snug truncate">
              {author.full_name}
            </h2>
            <p className="text-xs text-zinc-500 font-medium">Author Account</p>
          </div>
        </GlassCard>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <GlassCard className="p-6 space-y-4" hover={false}>
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/40 py-3.5 pl-11 pr-4 text-xs text-white placeholder:text-zinc-700 focus:outline-none focus:border-amber-500/30 transition-all font-semibold"
                  placeholder="Full name"
                />
              </div>
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/40 py-3.5 pl-11 pr-4 text-xs text-white placeholder:text-zinc-700 focus:outline-none focus:border-amber-500/30 transition-all font-semibold"
                  placeholder="Email address"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/40 py-3.5 pl-11 pr-4 text-xs text-white placeholder:text-zinc-700 focus:outline-none focus:border-amber-500/30 transition-all font-semibold"
                  placeholder="Phone number"
                />
              </div>
            </div>
          </GlassCard>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-2xl bg-white hover:bg-zinc-200 py-3.5 text-xs font-bold text-black uppercase tracking-wider transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> Save Details
              </>
            )}
          </button>
        </form>
      </div>
    </DashboardShell>
  );
}
