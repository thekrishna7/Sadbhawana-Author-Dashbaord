import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export default function StaffLoginPage() {
  return (
    <div className="ambient-bg flex min-h-screen items-center justify-center p-10">
      <Suspense>
        <LoginForm
          expectedRole="staff"
          title="Staff Operations"
          subtitle="Editorial & production workspace"
          redirectTo="/staff"
        />
      </Suspense>
    </div>
  );
}
