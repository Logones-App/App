import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/components/providers/query-provider";
import { AuthProvider, RoleInitializer } from "@/components/providers/auth-provider";
import { LoadingProvider } from "@/components/providers/loading-provider";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // Ensure that the incoming `locale` is valid
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange enableSystem={false}>
          <QueryProvider>
            <AuthProvider>
              <RoleInitializer>
                <LoadingProvider>
                  <NextIntlClientProvider>{children}</NextIntlClientProvider>
                </LoadingProvider>
              </RoleInitializer>
              <Toaster />
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
