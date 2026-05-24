"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthorBookPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/author/books");
  }, [router]);

  return null;
}
