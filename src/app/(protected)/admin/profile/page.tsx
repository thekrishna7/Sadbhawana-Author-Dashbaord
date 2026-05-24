"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { GlassCard } from "@/components/ui/glass-card";
import { createClient } from "@/lib/supabase/client";
import { uploadPublic } from "@/lib/storage";
import { ADMIN_NAV } from "@/lib/constants";
import { useToast } from "@/components/ui/toast";
import { Loader2, Camera, Lock, LogOut, User, Mail, Phone } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AdminProfilePage() {
  const [profile, setProfile] = useState<any | null>(null);

  // Profile fields state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Password fields state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [savingProfile, setSavingProfile] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const supabase = createClient();
  const toast = useToast();
  const router = useRouter();

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    const { data: p } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    
    if (p) {
      setProfile(p);
      setName(p.full_name || "");
      setEmail(p.email || "");
      setPhone(p.phone || "");
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  // Update profile details
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSavingProfile(true);

    try {
      // 1. If email changed, update auth.users
      if (email.trim() !== profile.email) {
        const { error: authErr } = await supabase.auth.updateUser({ email: email.trim() });
        if (authErr) throw authErr;
      }

      // 2. Update profiles table
      const { error: dbErr } = await supabase
        .from("profiles")
        .update({
          full_name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
        })
        .eq("id", profile.id);

      if (dbErr) throw dbErr;

      setProfile((prev: any) => ({
        ...prev,
        full_name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
      }));

      toast.success("Profile details updated.");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update profile details.");
    } finally {
      setSavingProfile(false);
    }
  };

  // Update password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long.");
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
      console.error(err);
      toast.error(err.message || "Failed to change password.");
    } finally {
      setUpdatingPassword(false);
    }
  };

  // Upload avatar / profile image
  const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setUploadingAvatar(true);
    try {
      const { publicUrl } = await uploadPublic("avatars", profile.id, file, "avatar-");
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", profile.id);

      if (error) throw error;

      setProfile((p: any) => ({ ...p, avatar_url: publicUrl }));
      toast.success("Profile photo updated!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to upload photo.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#030303] text-zinc-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  const isFormChanged =
    name.trim() !== (profile.full_name || "") ||
    email.trim() !== (profile.email || "") ||
    phone.trim() !== (profile.phone || "");

  return (
    <DashboardShell
      nav={ADMIN_NAV}
      profile={profile}
      brand="Author Dashboard"
      title="Profile"
      subtitle="Manage your administrator details and security credentials"
    >
      <div className="space-y-8 max-w-md mx-auto w-full">
        {/* Profile Image / Logo Upload */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            {profile.avatar_url ? (
              <div className="h-28 w-28 rounded-full overflow-hidden border-2 border-white/10 relative">
                <Image src={profile.avatar_url} alt={profile.full_name} fill className="object-cover" />
              </div>
            ) : (
              <div className="h-28 w-28 rounded-full bg-violet-500/10 border-2 border-dashed border-violet-500/20 flex items-center justify-center text-4xl font-serif text-violet-300 font-bold">
                {profile.full_name?.charAt(0) || "A"}
              </div>
            )}

            <label className="absolute bottom-1 right-1 cursor-pointer h-8 w-8 rounded-full bg-violet-600 flex items-center justify-center text-white border-2 border-[#050508] shadow-lg hover:scale-105 transition-all">
              {uploadingAvatar ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
              <input type="file" accept="image/*" className="hidden" disabled={uploadingAvatar} onChange={handleUploadAvatar} />
            </label>
          </div>

          <div className="text-center space-y-0.5">
            <h3 className="text-lg font-bold text-white font-serif">{profile.full_name}</h3>
            <p className="text-xs text-zinc-500 font-medium capitalize">{profile.role.replace("_", " ")} Account</p>
          </div>
        </div>

        {/* Profile Information Form */}
        <form onSubmit={handleUpdateProfile} className="space-y-4 pt-4 border-t border-white/5">
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
                className="w-full rounded-2xl border border-white/10 bg-black/40 py-3.5 pl-11 pr-4 text-xs text-white placeholder:text-zinc-700 focus:outline-none focus:border-violet-500/30 transition-all font-semibold"
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
                className="w-full rounded-2xl border border-white/10 bg-black/40 py-3.5 pl-11 pr-4 text-xs text-white placeholder:text-zinc-700 focus:outline-none focus:border-violet-500/30 transition-all font-semibold"
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
                className="w-full rounded-2xl border border-white/10 bg-black/40 py-3.5 pl-11 pr-4 text-xs text-white placeholder:text-zinc-700 focus:outline-none focus:border-violet-500/30 transition-all font-semibold"
                placeholder="Phone number"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={savingProfile || !isFormChanged}
            className="w-full rounded-2xl bg-white hover:bg-zinc-200 py-3.5 text-xs font-bold text-black uppercase tracking-wider transition disabled:opacity-40"
          >
            {savingProfile ? "Saving changes..." : "Save Profile Details"}
          </button>
        </form>

        {/* Change Password Form */}
        <form onSubmit={handleUpdatePassword} className="space-y-4 pt-6 border-t border-white/5">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white font-serif">Security Settings</h4>
            <p className="text-[10px] text-zinc-500">Update your dashboard login password.</p>
          </div>

          {/* New Password */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">New Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/40 py-3.5 pl-11 pr-4 text-xs text-white placeholder:text-zinc-700 focus:outline-none focus:border-violet-500/30 transition-all font-semibold"
                placeholder="Minimum 8 characters"
              />
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/40 py-3.5 pl-11 pr-4 text-xs text-white placeholder:text-zinc-700 focus:outline-none focus:border-violet-500/30 transition-all font-semibold"
                placeholder="Re-enter password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={updatingPassword || !newPassword || !confirmPassword}
            className="w-full rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 py-3.5 text-xs font-bold text-white uppercase tracking-wider transition disabled:opacity-40"
          >
            {updatingPassword ? "Updating password..." : "Change Password"}
          </button>
        </form>

        {/* Logout Section */}
        <div className="pt-6 border-t border-white/5">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 py-4 text-xs font-bold text-red-400 uppercase tracking-wider transition"
          >
            <LogOut className="h-4 w-4" /> Sign Out Account
          </button>
        </div>
      </div>
    </DashboardShell>
  );
}
