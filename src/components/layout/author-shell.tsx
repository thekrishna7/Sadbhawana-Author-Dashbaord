"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, BookOpen, Bell, User, Loader2, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types/database";
import Image from "next/image";

export function AuthorShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const supabase = createClient();

  const fetchUnreadCount = useCallback(async (userId: string) => {
    try {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("read", false);

      setUnreadNotifications(count ?? 0);
    } catch (err) {
      console.error("Failed to fetch unread notification count:", err);
    }
  }, [supabase]);

  useEffect(() => {
    let channel: any;

    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.replace("/login");
        return;
      }

      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single();

      if (!p || p.role !== "author") {
        // Fallback for admin/staff to not use author shell
        if (p?.role === "super_admin" || p?.role === "staff") {
          setProfile(p as Profile);
          setLoading(false);
          return;
        }
        router.replace("/login");
        return;
      }

      setProfile(p as Profile);
      setLoading(false);

      // Fetch notifications
      fetchUnreadCount(data.user.id);

      // Realtime notifications update
      channel = supabase
        .channel(`author-shell-notifs-${data.user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${data.user.id}`,
          },
          () => {
            fetchUnreadCount(data.user.id);
          }
        )
        .subscribe();
    });

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [router, supabase, fetchUnreadCount]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030303] text-zinc-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  const navItems = [
    { href: "/author", label: "Home", icon: Home },
    { href: "/author/books", label: "Books", icon: BookOpen },
    { href: "/author/notifications", label: "Notifications", icon: Bell, badge: unreadNotifications },
    { href: "/author/profile", label: "Profile", icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 flex flex-col items-center">
      {/* Maximum content container width to emulate a native mobile app view on desktop */}
      <div className="w-full max-w-xl min-h-screen flex flex-col bg-[#050508] border-x border-white/5 pb-24 shadow-2xl relative">
        
        {/* App Top Header Bar */}
        <header className="sticky top-0 z-40 bg-[#050508]/80 backdrop-blur-md border-b border-white/5 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Sadbhawana Publication"
              width={32}
              height={32}
              className="object-contain filter drop-shadow-[0_0_8px_rgba(245,158,11,0.15)]"
            />
            <div>
              <h1 className="text-sm font-bold text-white font-serif leading-none">
                {title || "Sadbhawana"}
              </h1>
              <p className="text-[9px] font-bold tracking-widest text-amber-500 uppercase mt-0.5">
                Publishing Companion
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {profile?.avatar_url ? (
              <div className="h-8 w-8 rounded-full overflow-hidden border border-white/10 relative">
                <Image src={profile.avatar_url} alt={profile.full_name} fill className="object-cover" />
              </div>
            ) : (
              <div className="h-8 w-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-xs font-bold text-amber-500">
                {profile?.full_name?.charAt(0) || "A"}
              </div>
            )}

            <button
              onClick={handleLogout}
              className="p-1.5 rounded-xl border border-white/5 bg-white/2 text-zinc-400 hover:text-white hover:bg-white/5 transition"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-grow p-6 flex flex-col">
          {children}
        </main>

        {/* Bottom Navigation Menu */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/5 bg-[#050508]/95 backdrop-blur-md py-3.5 px-6 flex justify-around items-center max-w-xl mx-auto shadow-2xl">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl relative transition-all duration-300 ${
                  isActive ? "text-amber-500" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <div className="relative">
                  <Icon className="h-5 w-5 stroke-[2]" />
                  {item.badge && item.badge > 0 ? (
                    <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[8px] font-black rounded-full h-4 w-4 flex items-center justify-center border border-[#050508]">
                      {item.badge}
                    </span>
                  ) : null}
                </div>
                <span className="text-[10px] font-medium tracking-wide">
                  {item.label}
                </span>

                {/* active line indicator */}
                {isActive && (
                  <motion.div
                    layoutId="active-nav-dot"
                    className="absolute -bottom-1 h-1 w-1 bg-amber-500 rounded-full"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
