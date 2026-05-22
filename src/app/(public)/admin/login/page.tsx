import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export default function AdminLoginPage() {
  return (
    <div className="ambient-bg flex min-h-screen items-center justify-center p-10">
      <Suspense>
        <LoginForm
          expectedRole="super_admin"
          title="HQ Access"
          subtitle="Super Admin Mission Control"
          redirectTo="/admin"
        />
      </Suspense>
    </div>
  );
}
