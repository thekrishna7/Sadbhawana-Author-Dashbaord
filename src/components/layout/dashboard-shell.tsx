"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { DashboardSidebar } from "./dashboard-sidebar";
import { NotificationBell } from "./notification-bell";
import type { Profile } from "@/lib/types/database";

export function DashboardShell({
  children,
  nav,
  profile,
  brand,
  title,
  subtitle,
  actions,
}: {
  children: React.ReactNode;
  nav: readonly { href: string; label: string; icon: string }[];
  profile: Profile;
  brand: string;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="ambient-bg min-h-screen">
      <DashboardSidebar
        nav={nav}
        profile={profile}
        brand={brand}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <main className="ml-0 lg:ml-72 min-h-screen transition-all duration-300">
        <header className="sticky top-0 z-30 border-b border-white/6 glass-strong px-6 lg:px-10 py-5 lg:py-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <button
                onClick={() => setSidebarOpen(true)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 lg:hidden transition"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                {title ? (
                  <h1 className="text-xl lg:text-3xl font-bold tracking-tight text-white truncate">
                    {title}
                  </h1>
                ) : (
                  <div className="h-9" />
                )}
                {subtitle && (
                  <p className="mt-1 text-xs lg:text-sm text-zinc-500 truncate hidden sm:block">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {actions && <div className="hidden sm:block">{actions}</div>}
              <NotificationBell profile={profile} />
            </div>
          </div>
          {actions && <div className="sm:hidden mt-4 pt-3 border-t border-white/5 flex justify-end">{actions}</div>}
        </header>
        <div className="p-6 lg:p-10 space-y-8 lg:space-y-10">{children}</div>
      </main>
    </div>
  );
}

