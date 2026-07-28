'use client';

import React, { useEffect, useState } from 'react';
import { User, Save, Lock, Mail, Phone, Camera } from 'lucide-react';
import { useToast } from '@/components/toast-context';

export default function AuthorProfilePage() {
  const { showToast } = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setFullName(data.user.fullName || '');
          setEmail(data.user.email || '');
          setAvatarUrl(data.user.avatarUrl || '');
        }
      });
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, phone, avatarUrl, email, newPassword }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast('Profile updated successfully', 'success');
        setNewPassword('');
      } else {
        showToast(data.error || 'Failed to update profile', 'error');
      }
    } catch {
      showToast('Server error', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
          <User className="w-7 h-7 text-blue-600" /> Author Profile Settings
        </h1>
        <p className="text-sm text-slate-500">Update your profile picture, contact info, and account password.</p>
      </div>

      <div className="p-6 md:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <form onSubmit={handleSaveProfile} className="space-y-6">
          <div className="flex items-center gap-5 pb-6 border-b border-slate-100 dark:border-slate-800">
            <img
              src={avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200'}
              alt="Avatar"
              className="w-20 h-20 rounded-2xl object-cover border-2 border-blue-500 shadow-md"
            />
            <div className="flex-1 space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Profile Photo (Select from Device)
              </label>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 text-xs font-bold flex items-center gap-2 border border-blue-200 dark:border-blue-800 transition-colors shadow-sm">
                  <Camera className="w-4 h-4" /> Upload New Photo
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const selected = e.target.files?.[0];
                      if (selected) {
                        if (selected.size > 5 * 1024 * 1024) {
                          showToast('Image size must be under 5MB', 'error');
                          return;
                        }
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setAvatarUrl(reader.result as string);
                          showToast('Photo selected! Click Save Profile to apply.', 'info');
                        };
                        reader.readAsDataURL(selected);
                      }
                    }}
                  />
                </label>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl('')}
                    className="text-xs text-rose-500 hover:underline font-semibold"
                  >
                    Remove Photo
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-400">Select any image file from your device (JPG, PNG, WEBP up to 5MB).</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                suppressHydrationWarning
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98*****090"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              New Password (Optional)
            </label>
            <input
              type="password"
              placeholder="Leave blank to keep existing password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all shadow-md glow-primary flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Profile Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
