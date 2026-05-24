"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthorSettingsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/author");
  }, [router]);

  return null;
}
