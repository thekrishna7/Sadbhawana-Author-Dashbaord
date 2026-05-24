import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminDashboardClient } from "./admin-dashboard-client";

export default async function AdminOverviewPage() {
  const profile = await getSessionProfile();
  if (!profile) return null;

  const supabase = await createClient();

  const [
    { count: authors },
    { count: books },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "author"),
    supabase.from("books").select("*", { count: "exact", head: true }),
  ]);

  return (
    <AdminDashboardClient
      profile={profile}
      stats={{
        authors: authors ?? 0,
        books: books ?? 0,
      }}
    />
  );
}
