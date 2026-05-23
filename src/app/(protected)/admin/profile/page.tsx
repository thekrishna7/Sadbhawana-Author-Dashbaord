"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { GlassCard } from "@/components/ui/glass-card";
import { createClient } from "@/lib/supabase/client";
import { uploadPublic } from "@/lib/storage";
import { ADMIN_NAV } from "@/lib/constants";
import { getInitials } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import {
  User,
  Mail,
  Lock,
  Phone,
  Briefcase,
  Globe,
  Settings,
  ShieldCheck,
  Bell,
  Signature as SigIcon,
  ChevronRight,
  Eye,
  EyeOff,
  Upload,
  Globe2,
  Trash2,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

interface SocialLinks {
  facebook?: string;
  twitter?: string;
  linkedin?: string;
  instagram?: string;
}

interface NotificationPrefs {
  email: boolean;
  push: boolean;
}

interface ProfileData {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  banner_url: string | null;
  designation: string | null;
  bio: string | null;
  about_author: string | null;
  phone: string | null;
  website: string | null;
  signature_url: string | null;
  two_factor_enabled: boolean;
  two_factor_secret: string | null;
  notification_preferences: NotificationPrefs;
  theme_preference: string;
  social_links: SocialLinks | null;
}

// Client-side TOTP utilities using Web Crypto API
function generateSecret() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let secret = "";
  for (let i = 0; i < 16; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return secret;
}

async function verifyTOTP(secret: string, code: string): Promise<boolean> {
  try {
    const base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    const cleanSecret = secret.toUpperCase().replace(/[\s-]/g, "");
    let bits = "";
    for (let i = 0; i < cleanSecret.length; i++) {
      const val = base32chars.indexOf(cleanSecret[i]);
      if (val === -1) continue;
      bits += val.toString(2).padStart(5, "0");
    }
    const bytes = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
      bytes.push(parseInt(bits.substring(i, i + 8), 2));
    }
    const keyBytes = new Uint8Array(bytes);

    const epoch = Math.round(new Date().getTime() / 1000);
    const timeStep = 30;
    const counter = Math.floor(epoch / timeStep);

    for (let d = -1; d <= 1; d++) {
      const c = counter + d;
      const buffer = new ArrayBuffer(8);
      const view = new DataView(buffer);
      const high = Math.floor(c / 0x100000000);
      const low = c % 0x100000000;
      view.setUint32(0, high, false);
      view.setUint32(4, low, false);
      const msgBytes = new Uint8Array(buffer);

      const key = await window.crypto.subtle.importKey(
        "raw",
        keyBytes,
        { name: "HMAC", hash: { name: "SHA-1" } },
        false,
        ["sign"]
      );

      const signature = await window.crypto.subtle.sign("HMAC", key, msgBytes);
      const hmacBytes = new Uint8Array(signature);

      const offset = hmacBytes[hmacBytes.length - 1] & 0xf;
      const binary =
        ((hmacBytes[offset] & 0x7f) << 24) |
        ((hmacBytes[offset + 1] & 0xff) << 16) |
        ((hmacBytes[offset + 2] & 0xff) << 8) |
        (hmacBytes[offset + 3] & 0xff);

      const totp = (binary % 1000000).toString().padStart(6, "0");
      if (totp === code) {
        return true;
      }
    }
    return false;
  } catch (err) {
    console.error("TOTP verification error:", err);
    return false;
  }
}

export default function AdminProfilePage() {
  const supabase = createClient();
  const toast = useToast();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [activeTab, setActiveTab] = useState<"general" | "social" | "security" | "preferences" | "signature">("general");

  // General state
  const [form, setForm] = useState<Partial<ProfileData>>({});
  const [saving, setSaving] = useState(false);

  // Password / Email change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [updatingCredentials, setUpdatingCredentials] = useState(false);

  // 2FA enabling state
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [tempSecret, setTempSecret] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [verifyingMfa, setVerifyingMfa] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single();
      
      const defaultPrefs = { email: true, push: false };
      const loadedPrefs = p?.notification_preferences 
        ? (p.notification_preferences as NotificationPrefs)
        : defaultPrefs;

      const profileObj: ProfileData = {
        ...(p as any),
        email: data.user.email || "",
        notification_preferences: loadedPrefs,
        theme_preference: p?.theme_preference || "dark",
        social_links: p?.social_links || {}
      };
      
      setProfile(profileObj);
      setForm(profileObj);
      setNewEmail(data.user.email || "");
    });
  }, [supabase]);

  // Upload Avatar / Banner / Signature
  async function handleUpload(bucket: "avatars" | "banners", field: keyof ProfileData, file: File) {
    if (!profile) return;
    try {
      const { publicUrl } = await uploadPublic(bucket, profile.id, file, `${field}-`);
      const { error } = await supabase
        .from("profiles")
        .update({ [field]: publicUrl })
        .eq("id", profile.id);
      
      if (error) throw error;
      
      setProfile((prev) => prev ? { ...prev, [field]: publicUrl } : null);
      setForm((prev) => ({ ...prev, [field]: publicUrl }));
      toast.success(`${field.replace(/_url/g, "")} updated successfully.`);
    } catch (err: any) {
      toast.error(err.message || "Upload failed.");
    }
  }

  // Update Profile Info
  async function handleSaveGeneral(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name,
          designation: form.designation,
          phone: form.phone,
          website: form.website,
          bio: form.bio,
          about_author: form.about_author,
          updated_at: new Date().toISOString()
        })
        .eq("id", profile.id);

      if (error) throw error;
      setProfile((prev) => prev ? { ...prev, ...form } : null);
      toast.success("Profile details updated.");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  // Update Social Links
  async function handleSaveSocial(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          social_links: form.social_links || {},
          updated_at: new Date().toISOString()
        })
        .eq("id", profile.id);

      if (error) throw error;
      setProfile((prev) => prev ? { ...prev, social_links: form.social_links || null } : null);
      toast.success("Social links updated.");
    } catch (err: any) {
      toast.error(err.message || "Failed to update social links.");
    } finally {
      setSaving(false);
    }
  }

  // Verify and update credentials (email/password)
  async function handleCredentialsUpdate(type: "email" | "password") {
    if (!profile) return;
    if (!currentPassword) {
      toast.error("Current password is required to verify your identity.");
      return;
    }

    setUpdatingCredentials(true);
    try {
      // 1. Verify current password by signing in again
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: currentPassword
      });

      if (verifyError) {
        throw new Error("Incorrect current password. Identity verification failed.");
      }

      // 2. Perform updating action
      if (type === "password") {
        if (!newPassword || newPassword.length < 8) {
          throw new Error("New password must be at least 8 characters long.");
        }
        const { error: updateError } = await supabase.auth.updateUser({
          password: newPassword
        });
        if (updateError) throw updateError;
        
        toast.success("Password changed successfully.");
        setNewPassword("");
        setCurrentPassword("");
      } else if (type === "email") {
        if (!newEmail || newEmail === profile.email) {
          throw new Error("Please enter a new, different email address.");
        }
        const { error: updateError } = await supabase.auth.updateUser({
          email: newEmail
        });
        if (updateError) throw updateError;

        // Also update profiles table
        await supabase.from("profiles").update({ email: newEmail }).eq("id", profile.id);
        
        setProfile((prev) => prev ? { ...prev, email: newEmail } : null);
        toast.success("Email address updated successfully.");
        setCurrentPassword("");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update credentials.");
    } finally {
      setUpdatingCredentials(false);
    }
  }

  // 2FA Enable Process
  function startEnableMFA() {
    const secret = generateSecret();
    setTempSecret(secret);
    setMfaCode("");
    setShow2FAModal(true);
  }

  async function handleConfirmMFA() {
    if (!profile || !tempSecret || !mfaCode) return;
    setVerifyingMfa(true);
    try {
      const isValid = await verifyTOTP(tempSecret, mfaCode);
      if (!isValid) {
        throw new Error("Invalid verification code. Please check your authenticator application.");
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          two_factor_enabled: true,
          two_factor_secret: tempSecret,
          updated_at: new Date().toISOString()
        })
        .eq("id", profile.id);
      
      if (error) throw error;

      // Log action to activity_logs
      await supabase.from("activity_logs").insert({
        user_id: profile.id,
        action: "enable_mfa",
        entity_type: "profile",
        entity_id: profile.id,
        metadata: { info: "Admin enabled 2FA" }
      });

      setProfile((prev) => prev ? { ...prev, two_factor_enabled: true, two_factor_secret: tempSecret } : null);
      setForm((prev) => ({ ...prev, two_factor_enabled: true, two_factor_secret: tempSecret }));
      toast.success("Two-Factor Authentication enabled successfully.");
      setShow2FAModal(false);
    } catch (err: any) {
      toast.error(err.message || "MFA validation failed.");
    } finally {
      setVerifyingMfa(false);
    }
  }

  async function handleDisableMFA() {
    if (!profile) return;
    if (!confirm("Are you sure you want to disable Two-Factor Authentication?")) return;
    
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          two_factor_enabled: false,
          two_factor_secret: null,
          updated_at: new Date().toISOString()
        })
        .eq("id", profile.id);

      if (error) throw error;

      // Log action to activity_logs
      await supabase.from("activity_logs").insert({
        user_id: profile.id,
        action: "disable_mfa",
        entity_type: "profile",
        entity_id: profile.id,
        metadata: { info: "Admin disabled 2FA" }
      });

      setProfile((prev) => prev ? { ...prev, two_factor_enabled: false, two_factor_secret: null } : null);
      setForm((prev) => ({ ...prev, two_factor_enabled: false, two_factor_secret: null }));
      toast.success("Two-Factor Authentication disabled.");
    } catch (err: any) {
      toast.error(err.message || "Failed to disable 2FA.");
    }
  }

  // Preferences Change
  async function handlePreferenceSave(field: "theme_preference" | "notification_preferences", value: any) {
    if (!profile) return;
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          [field]: value,
          updated_at: new Date().toISOString()
        })
        .eq("id", profile.id);

      if (error) throw error;

      setProfile((prev) => prev ? { ...prev, [field]: value } : null);
      setForm((prev) => ({ ...prev, [field]: value }));
      toast.success("Settings updated.");
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings.");
    }
  }

  if (!profile) return null;

  const tabItems = [
    { id: "general", label: "General details", icon: User },
    { id: "social", label: "Social profiles", icon: Globe2 },
    { id: "security", label: "Security & MFA", icon: ShieldCheck },
    { id: "preferences", label: "System preferences", icon: Settings },
    { id: "signature", label: "Author signature", icon: SigIcon }
  ] as const;

  return (
    <DashboardShell
      nav={ADMIN_NAV}
      profile={profile}
      brand="Author Dashboard"
      title="Profile Settings"
      subtitle="Manage your administrator details and security credentials"
    >
      {/* Banner */}
      <div className="relative h-44 rounded-3xl overflow-hidden mb-14 border border-white/5 shadow-2xl">
        {profile.banner_url ? (
          <Image src={profile.banner_url} alt="Profile banner" fill className="object-cover opacity-85" />
        ) : (
          <div className="h-full bg-gradient-to-r from-violet-950/40 via-zinc-900 to-zinc-950" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent" />
        <label className="absolute bottom-4 right-4 cursor-pointer rounded-2xl border border-white/10 bg-black/60 px-4 py-2 text-xs font-semibold text-white hover:bg-black/80 transition flex items-center gap-2 backdrop-blur-md">
          <Upload className="h-3 w-3" /> Change banner
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload("banners", "banner_url", file);
            }}
          />
        </label>
      </div>

      <div className="grid gap-8 lg:grid-cols-[250px_1fr]">
        {/* Navigation Tabs */}
        <div className="flex flex-col gap-2">
          {tabItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center justify-between rounded-2xl px-4 py-3.5 text-sm font-semibold transition ${
                  activeTab === item.id
                    ? "bg-violet-600 text-white shadow-lg shadow-violet-600/15"
                    : "text-zinc-500 hover:bg-white/5 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4.5 w-4.5" />
                  <span>{item.label}</span>
                </div>
                <ChevronRight className={`h-4 w-4 transition-transform ${activeTab === item.id ? "rotate-90" : "opacity-30"}`} />
              </button>
            );
          })}
        </div>

        {/* Form Area */}
        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {activeTab === "general" && (
              <motion.div
                key="general"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <GlassCard hover={false} className="p-8 space-y-6">
                  {/* Photo area */}
                  <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-white/5">
                    <div className="relative h-24 w-24 rounded-3xl overflow-hidden border-4 border-white/10 bg-violet-950/20 flex items-center justify-center shrink-0 shadow-xl">
                      {profile.avatar_url ? (
                        <Image src={profile.avatar_url} alt="Profile photo" fill className="object-cover" />
                      ) : (
                        <span className="text-3xl font-extrabold text-violet-300">{getInitials(profile.full_name)}</span>
                      )}
                    </div>
                    <div className="text-center sm:text-left space-y-2">
                      <p className="text-sm font-bold text-white">Profile picture</p>
                      <p className="text-xs text-zinc-500 max-w-xs">Supports PNG, JPG, or WEBP files. Max size 5MB.</p>
                      <label className="inline-flex cursor-pointer rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500 transition items-center gap-1.5 shadow-md shadow-violet-600/10 mt-1">
                        <Upload className="h-3 w-3" /> Upload new photo
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUpload("avatars", "avatar_url", file);
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  <form onSubmit={handleSaveGeneral} className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Full Name</label>
                        <div className="relative mt-2">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
                          <input
                            required
                            type="text"
                            value={form.full_name || ""}
                            onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
                            className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Designation</label>
                        <div className="relative mt-2">
                          <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
                          <input
                            type="text"
                            value={form.designation || ""}
                            onChange={(e) => setForm((prev) => ({ ...prev, designation: e.target.value }))}
                            placeholder="e.g. Director, Managing Editor"
                            className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Contact Number</label>
                        <div className="relative mt-2">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
                          <input
                            type="text"
                            value={form.phone || ""}
                            onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                            className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Website</label>
                        <div className="relative mt-2">
                          <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
                          <input
                            type="url"
                            value={form.website || ""}
                            onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))}
                            placeholder="https://"
                            className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Short Bio</label>
                      <textarea
                        value={form.bio || ""}
                        onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white min-h-[80px] focus:outline-none focus:border-violet-500 transition-colors"
                        placeholder="Write a short summary about yourself..."
                      />
                    </div>

                    <div>
                      <label className="text-xs text-zinc-500 font-bold uppercase tracking-wider">About / Description</label>
                      <textarea
                        value={form.about_author || ""}
                        onChange={(e) => setForm((prev) => ({ ...prev, about_author: e.target.value }))}
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white min-h-[140px] focus:outline-none focus:border-violet-500 transition-colors"
                        placeholder="Provide details about your experience, achievements, and editorial history..."
                      />
                    </div>

                    <div className="flex justify-end pt-3">
                      <button
                        type="submit"
                        disabled={saving}
                        className="rounded-2xl bg-violet-600 px-6 py-3 text-xs font-bold text-white hover:bg-violet-500 disabled:opacity-50 transition shadow-lg shadow-violet-600/15"
                      >
                        {saving ? "Saving changes..." : "Save general details"}
                      </button>
                    </div>
                  </form>
                </GlassCard>
              </motion.div>
            )}

            {activeTab === "social" && (
              <motion.div
                key="social"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <GlassCard hover={false} className="p-8 space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-white">Social links</h3>
                    <p className="text-xs text-zinc-500 mt-1">Configure your official social handles for publication directories.</p>
                  </div>

                  <form onSubmit={handleSaveSocial} className="space-y-5">
                    {(["facebook", "twitter", "linkedin", "instagram"] as const).map((network) => (
                      <div key={network}>
                        <label className="text-xs text-zinc-500 font-bold uppercase tracking-wider capitalize">{network}</label>
                        <input
                          type="text"
                          value={form.social_links?.[network] || ""}
                          onChange={(e) => {
                            setForm((prev) => ({
                              ...prev,
                              social_links: {
                                ...(prev.social_links || {}),
                                [network]: e.target.value
                              }
                            }));
                          }}
                          placeholder={`Username or profile URL`}
                          className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
                        />
                      </div>
                    ))}

                    <div className="flex justify-end pt-3">
                      <button
                        type="submit"
                        disabled={saving}
                        className="rounded-2xl bg-violet-600 px-6 py-3 text-xs font-bold text-white hover:bg-violet-500 disabled:opacity-50 transition shadow-lg shadow-violet-600/15"
                      >
                        {saving ? "Saving links..." : "Save social profiles"}
                      </button>
                    </div>
                  </form>
                </GlassCard>
              </motion.div>
            )}

            {activeTab === "security" && (
              <motion.div
                key="security"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* 2FA Setup */}
                <GlassCard hover={false} className="p-8 space-y-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-violet-400" /> Two-Factor Authentication (2FA)
                      </h3>
                      <p className="text-xs text-zinc-500 mt-1">Add an extra layer of security using standard authenticator apps (Google Authenticator, Duo, etc.).</p>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                      profile.two_factor_enabled
                        ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/25"
                        : "text-zinc-400 bg-zinc-500/10 border-zinc-500/25"
                    }`}>
                      {profile.two_factor_enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>

                  <div className="border-t border-white/5 pt-5 space-y-4">
                    {profile.two_factor_enabled ? (
                      <div className="space-y-3">
                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 px-4 py-3 text-xs text-emerald-300 leading-relaxed">
                          Your account is secured with Two-Factor Authentication. Authenticator codes will be required during sign-in.
                        </div>
                        <button
                          type="button"
                          onClick={handleDisableMFA}
                          className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition"
                        >
                          Disable 2FA
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-xs text-zinc-400">Secure your portal using an Authenticator app. We will generate a secret configuration key for setup.</p>
                        <button
                          type="button"
                          onClick={startEnableMFA}
                          className="rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-violet-500 transition shadow-lg shadow-violet-600/10"
                        >
                          Set up authenticator
                        </button>
                      </div>
                    )}
                  </div>
                </GlassCard>

                {/* Identity Credentials Changes */}
                <GlassCard hover={false} className="p-8 space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-white">Login credentials</h3>
                    <p className="text-xs text-zinc-500 mt-1">Securely change your account password or email address. Identity verification is required.</p>
                  </div>

                  {/* Verification Password Input (Universal) */}
                  <div className="p-5 border border-white/5 rounded-2xl bg-white/2">
                    <label className="text-xs text-violet-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5" /> Identity Verification
                    </label>
                    <p className="text-xs text-zinc-500 mt-1">Please enter your current administrator password before modifying any credentials below.</p>
                    <div className="relative mt-3">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Current password"
                        className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-11 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                      >
                        {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Forms Grid */}
                  <div className="grid gap-6 md:grid-cols-2 pt-2">
                    {/* Change Email */}
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">Update email</h4>
                        <p className="text-[11px] text-zinc-500 mt-0.5">Your email address will be updated for login and notifications.</p>
                      </div>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
                        <input
                          type="email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          placeholder="New email address"
                          className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={updatingCredentials}
                        onClick={() => handleCredentialsUpdate("email")}
                        className="rounded-xl border border-violet-500/20 bg-violet-500/10 px-4 py-2.5 text-xs font-bold text-violet-400 hover:bg-violet-500/25 transition disabled:opacity-50"
                      >
                        Change Email Address
                      </button>
                    </div>

                    {/* Change Password */}
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">Change password</h4>
                        <p className="text-[11px] text-zinc-500 mt-0.5">Enter a strong, secure new password (min. 8 characters).</p>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
                        <input
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="New password"
                          className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-11 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <button
                        type="button"
                        disabled={updatingCredentials}
                        onClick={() => handleCredentialsUpdate("password")}
                        className="rounded-xl border border-violet-500/20 bg-violet-500/10 px-4 py-2.5 text-xs font-bold text-violet-400 hover:bg-violet-500/25 transition disabled:opacity-50"
                      >
                        Update Password
                      </button>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            )}

            {activeTab === "preferences" && (
              <motion.div
                key="preferences"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Theme Selector */}
                <GlassCard hover={false} className="p-8 space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-white">Theme preferences</h3>
                    <p className="text-xs text-zinc-500 mt-1">Select your preferred user interface visual configuration.</p>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-2">
                    {["dark", "light", "cinematic"].map((t) => (
                      <button
                        key={t}
                        onClick={() => handlePreferenceSave("theme_preference", t)}
                        className={`rounded-2xl border p-4 text-center transition ${
                          profile.theme_preference === t
                            ? "border-violet-500 bg-violet-500/10 text-white"
                            : "border-white/5 bg-white/2 text-zinc-400 hover:border-white/10 hover:text-white"
                        }`}
                      >
                        <p className="text-xs font-bold uppercase tracking-wider capitalize">{t}</p>
                        <div className={`h-1.5 w-1.5 rounded-full mx-auto mt-2 ${profile.theme_preference === t ? "bg-violet-400" : "bg-transparent"}`} />
                      </button>
                    ))}
                  </div>
                </GlassCard>

                {/* Notifications Channels */}
                <GlassCard hover={false} className="p-8 space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Bell className="h-5 w-5 text-violet-400" /> Notification channels
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1">Choose how you wish to receive system-wide updates and logs.</p>
                  </div>

                  <div className="space-y-4 pt-2 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-white uppercase tracking-wider">Email updates</p>
                        <p className="text-xs text-zinc-500">Receive summaries of pipeline progress and royalty claims.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={profile.notification_preferences.email}
                        onChange={(e) => {
                          const val = { ...profile.notification_preferences, email: e.target.checked };
                          handlePreferenceSave("notification_preferences", val);
                        }}
                        className="h-5 w-5 rounded border-white/10 bg-white/5 text-violet-600 focus:ring-0 cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                      <div>
                        <p className="text-xs font-bold text-white uppercase tracking-wider">Push alerts</p>
                        <p className="text-xs text-zinc-500">Receive instant browser indicators for new author messages.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={profile.notification_preferences.push}
                        onChange={(e) => {
                          const val = { ...profile.notification_preferences, push: e.target.checked };
                          handlePreferenceSave("notification_preferences", val);
                        }}
                        className="h-5 w-5 rounded border-white/10 bg-white/5 text-violet-600 focus:ring-0 cursor-pointer"
                      />
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            )}

            {activeTab === "signature" && (
              <motion.div
                key="signature"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <GlassCard hover={false} className="p-8 space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <SigIcon className="h-5 w-5 text-violet-400" /> Signature upload
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1">Upload an image of your signature. This will be automatically embedded on documents, agreements, and payment approval vouchers.</p>
                  </div>

                  <div className="border-t border-white/5 pt-5 space-y-6">
                    {profile.signature_url ? (
                      <div className="space-y-4">
                        <div className="relative h-36 w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-950 p-4 flex items-center justify-center overflow-hidden">
                          <Image src={profile.signature_url} alt="Official signature" width={280} height={100} className="object-contain filter invert opacity-90" />
                          <button
                            type="button"
                            onClick={async () => {
                              if (!confirm("Are you sure you want to remove your signature?")) return;
                              const { error } = await supabase.from("profiles").update({ signature_url: null }).eq("id", profile.id);
                              if (error) toast.error(error.message);
                              else {
                                setProfile((p) => p ? { ...p, signature_url: null } : null);
                                setForm((p) => ({ ...p, signature_url: null }));
                                toast.success("Signature removed.");
                              }
                            }}
                            className="absolute top-2 right-2 p-1.5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/30 transition"
                            title="Remove Signature"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="text-xs text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 shrink-0" /> Signature is uploaded and verified.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center border border-dashed border-white/10 rounded-2xl p-10 bg-white/2 hover:bg-white/3 transition">
                        <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center mb-4">
                          <SigIcon className="h-6 w-6 text-violet-400" />
                        </div>
                        <p className="text-xs font-semibold text-zinc-300">No signature image uploaded</p>
                        <p className="text-[11px] text-zinc-500 mt-1 max-w-xs text-center">Please upload a clean PNG file of your signature with a transparent background.</p>
                        <label className="mt-4 inline-flex cursor-pointer rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-violet-500 transition shadow-lg shadow-violet-600/10 items-center gap-2">
                          <Upload className="h-3.5 w-3.5" /> Select image file
                          <input
                            type="file"
                            accept="image/png"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleUpload("avatars", "signature_url", file);
                            }}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* MFA Setup Dialog Modal */}
      <AnimatePresence>
        {show2FAModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 8 }}
              transition={{ type: "spring", damping: 22, stiffness: 300 }}
              className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 shadow-2xl backdrop-blur-xl"
            >
              <div className="border-b border-white/5 px-6 py-4 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="h-4.5 w-4.5 text-violet-400" /> Set Up Google Authenticator / Duo
                </h3>
                <button
                  onClick={() => setShow2FAModal(false)}
                  className="text-zinc-500 hover:text-white"
                >
                  <EyeOff className="h-4 w-4" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="space-y-2">
                  <p className="text-xs text-zinc-300 font-semibold leading-relaxed">
                    1. Scan or manually enter this secret setup key into your authenticator app:
                  </p>
                  <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3 font-mono text-xs select-all text-violet-300 tracking-wider">
                    {tempSecret}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-zinc-300 font-semibold">
                    2. Enter the 6-digit confirmation code generated by your app:
                  </p>
                  <input
                    type="text"
                    maxLength={6}
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="000 000"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 text-center text-lg font-bold tracking-widest text-white focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/5 bg-zinc-900/20">
                <button
                  type="button"
                  onClick={() => setShow2FAModal(false)}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={verifyingMfa || mfaCode.length !== 6}
                  onClick={handleConfirmMFA}
                  className="rounded-xl bg-violet-600 px-5 py-2 text-xs font-bold text-white hover:bg-violet-500 disabled:opacity-50 transition"
                >
                  {verifyingMfa ? "Verifying..." : "Enable 2FA"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardShell>
  );
}
