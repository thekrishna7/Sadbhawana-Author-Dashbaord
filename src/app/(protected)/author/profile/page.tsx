"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { createClient } from "@/lib/supabase/client";
import { uploadPublic } from "@/lib/storage";
import { AUTHOR_NAV } from "@/lib/constants";
import type { Profile } from "@/lib/types/database";

export default function AuthorProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState<Partial<Profile>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    createClient().auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: p } = await createClient().from("profiles").select("*").eq("id", data.user.id).single();
      setProfile(p as Profile);
      setForm(p as Profile);
    });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    await createClient().from("profiles").update({
      full_name: form.full_name,
      bio: form.bio,
      about_author: form.about_author,
      website: form.website,
      phone: form.phone,
      bank_account_name: form.bank_account_name,
      bank_account_number: form.bank_account_number,
      bank_ifsc: form.bank_ifsc,
      bank_upi: form.bank_upi,
      social_links: form.social_links,
    }).eq("id", profile.id);
    setSaving(false);
  }

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    const { publicUrl } = await uploadPublic("avatars", profile.id, file);
    await createClient().from("profiles").update({ avatar_url: publicUrl }).eq("id", profile.id);
    setProfile((p) => (p ? { ...p, avatar_url: publicUrl } : p));
  }

  async function uploadBanner(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    const { publicUrl } = await uploadPublic("banners", profile.id, file);
    await createClient().from("profiles").update({ banner_url: publicUrl }).eq("id", profile.id);
    setProfile((p) => (p ? { ...p, banner_url: publicUrl } : p));
  }

  if (!profile) return null;

  return (
    <DashboardShell nav={AUTHOR_NAV} profile={profile} brand="Creator Workspace" title="Profile" subtitle="Syncs instantly with HQ">
      <div className="relative h-40 rounded-3xl overflow-hidden mb-20">
        {profile.banner_url ? <Image src={profile.banner_url} alt="" fill className="object-cover" /> : <div className="h-full bg-violet-900/30" />}
        <label className="absolute bottom-4 right-4 cursor-pointer rounded-xl bg-black/50 px-4 py-2 text-sm text-white">
          Change banner <input type="file" accept="image/*" className="hidden" onChange={uploadBanner} />
        </label>
      </div>

      <form onSubmit={save} className="max-w-2xl space-y-6">
        <label className="inline-block cursor-pointer">
          <div className="h-24 w-24 rounded-2xl overflow-hidden bg-violet-500/20 relative">
            {profile.avatar_url && <Image src={profile.avatar_url} alt="" fill className="object-cover" />}
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={uploadAvatar} />
        </label>

        {(["full_name", "bio", "about_author", "website", "phone", "bank_account_name", "bank_account_number", "bank_ifsc", "bank_upi"] as const).map((key) => (
          <div key={key}>
            <label className="text-sm text-zinc-500 capitalize">{key.replace(/_/g, " ")}</label>
            {key === "bio" || key === "about_author" ? (
              <textarea className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white min-h-[80px]" value={String(form[key] ?? "")} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
            ) : (
              <input className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white" value={String(form[key] ?? "")} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
            )}
          </div>
        ))}

        <button type="submit" disabled={saving} className="rounded-2xl bg-violet-600 px-8 py-3 text-white font-medium">
          {saving ? "Savingâ€¦" : "Save profile"}
        </button>
      </form>
    </DashboardShell>
  );
}

