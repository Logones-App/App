import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/components/providers/query-provider";
import { AuthProvider, RoleInitializer } from "@/components/providers/auth-provider";
import { LoadingProvider } from "@/components/providers/loading-provider";
import { getMessages } from "next-intl/server";
import { LocaleCookieSync } from "@/components/ui/locale-cookie-sync";

// NOTE : Dans ce projet, Next.js fournit 'params' comme une Promise (voir https://nextjs.org/docs/messages/sync-dynamic-apis)
// Il faut donc faire 'await params' pour récupérer la locale correctement.
// Fonction utilitaire pour TS : vérifie et type la locale
function isSupportedLocale(l: string): l is "fr" | "en" | "es" {
  return routing.locales.includes(l as any);
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) {
    notFound();
  }
  const localeTyped: "fr" | "en" | "es" = locale;
  const messages = await getMessages({ locale: localeTyped });

  return (
    <html lang={localeTyped} suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange enableSystem={false}>
          <QueryProvider>
            <AuthProvider>
              <RoleInitializer>
                <NextIntlClientProvider locale={localeTyped} messages={messages}>
                  <LoadingProvider>
                    <LocaleCookieSync />
                    {children}
                  </LoadingProvider>
                </NextIntlClientProvider>
              </RoleInitializer>
              <Toaster />
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
