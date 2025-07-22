import { routing } from "@/i18n/routing";
import { useParams, usePathname } from "next/navigation";

export function LanguageSwitcher() {
  const params = useParams();
  const pathname = usePathname();
  const currentLocale = params?.locale as string;

  const handleChange = (newLocale: string) => {
    // Supprime l'ancien cookie
    document.cookie = "NEXT_LOCALE=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    // Set le nouveau cookie
    const expires = new Date(Date.now() + 31536000 * 1000).toUTCString();
    document.cookie = `NEXT_LOCALE=${newLocale}; expires=${expires}; path=/; SameSite=Lax`;
    // Redirige vers la même page avec la nouvelle locale
    const newPath = pathname.replace(/^\/([a-z]{2})/, `/${newLocale}`);
    setTimeout(() => {
      window.location.href = newPath;
    }, 100);
  };

  return (
    <div className="flex gap-2">
      {routing.locales.map((locale) => (
        <button
          key={locale}
          disabled={locale === currentLocale}
          onClick={() => handleChange(locale)}
          className={`px-2 py-1 rounded text-sm border ${locale === currentLocale ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}
        >
          {locale.toUpperCase()}
        </button>
      ))}
    </div>
  );
} 