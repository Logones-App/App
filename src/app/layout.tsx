import { ReactNode } from "react";
import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { APP_CONFIG } from "@/config/app-config";
import { QueryProvider } from "@/components/providers/query-provider";
import { AuthProvider, RoleInitializer } from "@/components/providers/auth-provider";
import { LoadingProvider } from "@/components/providers/loading-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: APP_CONFIG.meta.title,
  description: APP_CONFIG.meta.description,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange enableSystem={false}>
          <QueryProvider>
            <AuthProvider>
              <RoleInitializer>
                <LoadingProvider>{children}</LoadingProvider>
              </RoleInitializer>
              <Toaster />
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
