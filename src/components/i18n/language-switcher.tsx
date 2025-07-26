"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Globe } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LANGUAGES = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
];

interface LanguageSwitcherProps {
  variant?: "dropdown" | "buttons";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LanguageSwitcher({ variant = "dropdown", size = "md", className = "" }: LanguageSwitcherProps) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("common");

  // Détecte la locale actuelle depuis l'URL
  const currentLocale = pathname.split("/")[1] || "fr";

  const handleChange = (lang: string) => {
    // Supprime l'ancien cookie
    document.cookie = "NEXT_LOCALE=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    // Set le nouveau cookie
    const expires = new Date(Date.now() + 31536000 * 1000).toUTCString();
    document.cookie = `NEXT_LOCALE=${lang}; expires=${expires}; path=/; SameSite=Lax`;

    // Remplace la locale dans l'URL
    const segments = pathname.split("/");
    segments[1] = lang;
    const newPath = segments.join("/");

    // Redirige vers la même page avec la nouvelle locale
    setTimeout(() => {
      router.push(newPath);
    }, 100);
  };

  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return "h-6 w-6 text-xs";
      case "lg":
        return "h-10 w-10 text-base";
      default:
        return "h-8 w-8 text-sm";
    }
  };

  if (variant === "buttons") {
    return (
      <div className={`flex gap-2 ${className}`}>
        {LANGUAGES.map((lang) => (
          <Button
            key={lang.code}
            variant={currentLocale === lang.code ? "default" : "outline"}
            size="sm"
            onClick={() => handleChange(lang.code)}
            className="flex items-center gap-2"
          >
            <span className="hidden sm:inline">{lang.label}</span>
          </Button>
        ))}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={`${getSizeClasses()} ${className}`}>
          <Globe className="h-4 w-4" />
          <span className="sr-only">{t("change_language")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleChange(lang.code)}
            className={`flex items-center gap-2 ${currentLocale === lang.code ? "bg-accent font-bold" : ""}`}
          >
            <span>{lang.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
