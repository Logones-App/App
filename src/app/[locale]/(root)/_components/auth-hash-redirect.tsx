"use client";

import { useEffect } from "react";

import { useRouter } from "@/i18n/navigation";

export function AuthHashRedirect() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    if (!hash) return;
    const params = new URLSearchParams(hash);
    const type = params.get("type");
    if (type === "recovery") {
      router.replace(`/auth/reset-password${window.location.hash}`);
    }
  }, [router]);

  return null;
}
