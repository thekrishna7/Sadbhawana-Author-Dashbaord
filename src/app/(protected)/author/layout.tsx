import { requireRole } from "@/lib/auth";

export default async function AuthorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["author", "super_admin"], "/login");
  return <>{children}</>;
}
