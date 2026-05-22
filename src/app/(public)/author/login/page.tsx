import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export default function AuthorLoginPage() {
  return (
    <div className="ambient-bg flex min-h-screen items-center justify-center p-10">
      <Suspense>
        <LoginForm
          expectedRole="author"
          title="Creator Portal"
          subtitle="Your publishing operating system"
          redirectTo="/author"
        />
      </Suspense>
    </div>
  );
}
