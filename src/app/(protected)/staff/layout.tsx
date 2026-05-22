import { requireRole } from "@/lib/auth";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["staff", "super_admin"], "/login");
  return <>{children}</>;
}
