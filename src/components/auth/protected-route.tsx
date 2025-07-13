"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useUserRoles } from "@/lib/queries/auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  fallback?: React.ReactNode;
}

export function ProtectedRoute({ children, requiredRoles, fallback }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();

  const { data: userRoles = [] } = useUserRoles(user?.id);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push("/auth/login");
        return;
      }

      if (requiredRoles && requiredRoles.length > 0) {
        const hasRequiredRole = requiredRoles.some((role) => userRoles.includes(role));
        if (!hasRequiredRole) {
          router.push("/unauthorized");
          return;
        }
      }
    }
  }, [isAuthenticated, isLoading, userRoles, requiredRoles, router]);

  // Afficher un loader pendant le chargement
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2"></div>
      </div>
    );
  }

  // Afficher le fallback si fourni
  if (fallback) {
    return <>{fallback}</>;
  }

  // Afficher les enfants si authentifié et autorisé
  return <>{children}</>;
}
