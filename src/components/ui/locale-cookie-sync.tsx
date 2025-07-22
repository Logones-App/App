"use client";
import { useEffect } from "react";
import { useParams } from "next/navigation";
import { routing } from "../../../i18n/routing";

export function LocaleCookieSync() {
  const params = useParams();
  const locale = params?.locale as string;

  useEffect(() => {
    if (locale && routing.locales.includes(locale)) {
      document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; SameSite=Lax`;
    }
  }, [locale]);

  return null;
} 