"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthorDocumentsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/author");
  }, [router]);

  return null;
}
