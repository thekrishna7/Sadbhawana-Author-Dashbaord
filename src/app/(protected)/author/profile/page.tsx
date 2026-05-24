"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AuthorShell } from "@/components/layout/author-shell";
import { createClient } from "@/lib/supabase/client";
import { uploadPublic } from "@/lib/storage";
import { useToast } from "@/components/ui/toast";
import type { Profile } from "@/lib/types/database";
import { Loader2, Camera, Lock, LogOut, CheckCircle2, User, Mail } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AuthorProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [savingProfile, setSavingProfile] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const supabase = createClient();
  const toast = useToast();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single();
      
      if (p) {
        setProfile(p as Profile);
        setName(p.full_name || "");
        setEmail(p.email || "");
      }
    });
  }, [supabase]);

  // Update profile name
  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSavingProfile(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: name.trim() })
        .eq("id", profile.id);

      if (error) throw error;
      
      setProfile((prev) => (prev ? { ...prev, full_name: name.trim() } : prev));
      toast.success("Profile name updated.");
    } catch (err: any) {
      toast.error(err.message || "Failed to update name.");
    } finally {
      setSavingProfile(false);
    }
  }

  // Update password
  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      
      toast.success("Password changed successfully!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to change password.");
    } finally {
      setUpdatingPassword(false);
    }
  }

  // Upload avatar
  async function handleUploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setUploadingAvatar(true);
    try {
      const { publicUrl } = await uploadPublic("avatars", profile.id, file);
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", profile.id);

      if (error) throw error;

      setProfile((p) => (p ? { ...p, avatar_url: publicUrl } : p));
      toast.success("Profile photo updated!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload photo.");
    } finally {
      setUploadingAvatar(false);
    }
  }

  // Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#030303] text-zinc-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <AuthorShell title="Profile">
      <div className="space-y-8 flex-grow flex flex-col justify-center max-w-md mx-auto w-full">
        {/* Profile Photo Area */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative group">
            {profile.avatar_url ? (
              <div className="h-28 w-28 rounded-full overflow-hidden border-2 border-white/10 relative">
                <Image src={profile.avatar_url} alt={profile.full_name} fill className="object-cover" />
              </div>
            ) : (
              <div className="h-28 w-28 rounded-full bg-amber-500/10 border-2 border-dashed border-amber-500/20 flex items-center justify-center text-4xl font-serif text-amber-500 font-bold">
                {profile.full_name?.charAt(0) || "A"}
              </div>
            )}

            {/* Upload Overlay */}
            <label className="absolute bottom-1 right-1 cursor-pointer h-8 w-8 rounded-full bg-amber-500 flex items-center justify-center text-black border-2 border-[#050508] shadow-lg hover:scale-105 transition-all">
              {uploadingAvatar ? (
                <Loader2 className="h-4 w-4 animate-spin text-black" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
              <input type="file" accept="image/*" className="hidden" disabled={uploadingAvatar} onChange={handleUploadAvatar} />
            </label>
          </div>

          <div className="text-center space-y-0.5">
            <h3 className="text-lg font-bold text-white font-serif">{profile.full_name}</h3>
            <p className="text-xs text-zinc-500 font-medium">Author Account</p>
          </div>
        </div>

        {/* Profile details form */}
        <form onSubmit={handleUpdateProfile} className="space-y-4 pt-4 border-t border-white/5">
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
                placeholder="Your name"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Email Address (Read Only)</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
              <input
                type="email"
                readOnly
                value={email}
                className="w-full rounded-2xl border border-white/5 bg-zinc-950/40 py-3.5 pl-11 pr-4 text-xs text-zinc-500 focus:outline-none font-semibold cursor-not-allowed select-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={savingProfile || name.trim() === profile.full_name}
            className="w-full rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 py-3 text-xs font-bold text-white uppercase tracking-wider transition disabled:opacity-40"
          >
            {savingProfile ? "Saving changes..." : "Save Profile Details"}
          </button>
        </form>

        {/* Change Password Form */}
        <form onSubmit={handleUpdatePassword} className="space-y-4 pt-6 border-t border-white/5">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white font-serif">Security Settings</h4>
            <p className="text-[10px] text-zinc-500">Update your security passkey for this secure device.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">New Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/40 py-3.5 pl-11 pr-4 text-xs text-white placeholder:text-zinc-700 focus:outline-none focus:border-amber-500/30 transition-all font-semibold"
                placeholder="Minimum 6 characters"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/40 py-3.5 pl-11 pr-4 text-xs text-white placeholder:text-zinc-700 focus:outline-none focus:border-amber-500/30 transition-all font-semibold"
                placeholder="Re-enter new password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={updatingPassword || !newPassword || !confirmPassword}
            className="w-full rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 py-3 text-xs font-bold text-white uppercase tracking-wider transition disabled:opacity-40"
          >
            {updatingPassword ? "Updating passkey..." : "Change Passkey"}
          </button>
        </form>

        {/* Logout Section */}
        <div className="pt-6 border-t border-white/5">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 py-3.5 text-xs font-bold text-amber-500 uppercase tracking-wider transition"
          >
            <LogOut className="h-4 w-4" /> Sign Out Workspace
          </button>
        </div>
      </div>
    </AuthorShell>
  );
}
