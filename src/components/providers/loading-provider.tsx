"use client";

import { useAuthStore } from "@/lib/stores/auth-store";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

interface LoadingProviderProps {
  children: React.ReactNode;
}

export function LoadingProvider({ children }: LoadingProviderProps) {
  const { isLoading, user, isAuthenticated } = useAuthStore();
  const [showDebug, setShowDebug] = useState(false);
  const pathname = usePathname();
  const t = useTranslations("common");

  // Pages qui ne nécessitent pas d'authentification
  const publicPages = ["/", "/test-auth", "/auth/login", "/auth/register"];
  const isPublicPage = publicPages.some((page) => pathname?.startsWith(page));

  useEffect(() => {
    // Afficher les infos de debug après 3 secondes si toujours en loading
    const timer = setTimeout(() => {
      if (isLoading) {
        setShowDebug(true);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [isLoading]);

  // Si c'est une page publique, ne pas bloquer le rendu
  if (isPublicPage) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="bg-background flex min-h-screen flex-col items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2"></div>
          <p className="text-muted-foreground text-sm">{t("loading")}</p>

          {showDebug && (
            <div className="mt-4 rounded-lg border p-4 text-xs">
              <p>
                <strong>Debug Info:</strong>
              </p>
              <p>Loading: {isLoading ? "true" : "false"}</p>
              <p>User: {user ? "Connected" : "Not connected"}</p>
              <p>Authenticated: {isAuthenticated ? "true" : "false"}</p>
              <p>Path: {pathname}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 rounded bg-blue-500 px-2 py-1 text-white"
              >
                Recharger
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
