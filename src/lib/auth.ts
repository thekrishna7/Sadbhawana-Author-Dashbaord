import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/lib/types/database";

export async function getSessionProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile as Profile | null;
}

export async function requireRole(roles: UserRole[], loginPath: string) {
  const profile = await getSessionProfile();
  if (!profile) redirect(loginPath);
  if (profile.status === "suspended") redirect(loginPath + "?error=suspended");
  if (!roles.includes(profile.role)) {
    redirect(getDashboardForRole(profile.role));
  }
  return profile;
}

export function getDashboardForRole(role: UserRole): string {
  switch (role) {
    case "super_admin":
      return "/admin";
    case "staff":
      return "/staff";
    case "author":
      return "/author";
    default:
      return "/";
  }
}

export function getLoginForRole(role: UserRole): string {
  switch (role) {
    case "super_admin":
    case "staff":
    case "author":
      return "/login";
    default:
      return "/";
  }
}
