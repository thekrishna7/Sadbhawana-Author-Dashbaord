"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  UserCog,
  BookOpen,
  GitBranch,
  Wallet,
  BarChart3,
  MessageSquare,
  FileText,
  Sparkles,
  Settings,
  User,
  LogOut,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types/database";
import { AnimatePresence } from "framer-motion";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  UserCog,
  BookOpen,
  GitBranch,
  Wallet,
  BarChart3,
  MessageSquare,
  FileText,
  Sparkles,
  Settings,
  User,
};

export function DashboardSidebar({
  nav,
  profile,
  brand,
  isOpen,
  onClose,
}: {
  nav: readonly { href: string; label: string; icon: string }[];
  profile: Profile;
  brand: string;
  isOpen?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-screen w-72 flex-col border-r border-white/6 glass-strong transition-transform duration-300 lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="border-b border-white/6 p-8 relative">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">
            Publishing OS
          </p>
          <h2 className="mt-2 text-2xl font-bold text-white">{brand}</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-8 right-6 lg:hidden text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-white/5 transition"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {nav.map((item) => {
            const Icon = ICONS[item.icon] ?? LayoutDashboard;
            const active =
              pathname === item.href ||
              (item.href !== "/admin" &&
                item.href !== "/author" &&
                item.href !== "/staff" &&
                pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} onClick={onClose}>
                <motion.span
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                    active
                      ? "bg-violet-500/20 text-violet-200"
                      : "text-zinc-400 hover:bg-white/5 hover:text-white"
                  )}
                  whileTap={{ scale: 0.98 }}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {item.label}
                </motion.span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/6 p-4 space-y-2">
          <div className="flex items-center gap-3 rounded-2xl px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20 text-sm font-bold text-violet-300">
              {profile.full_name?.[0] ?? "?"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">
                {profile.full_name}
              </p>
              <p className="truncate text-xs text-zinc-500 capitalize">
                {profile.role.replace("_", " ")}
              </p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm text-zinc-500 hover:bg-white/5 hover:text-red-400 transition"
          >
            <LogOut className="h-5 w-5" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}

