"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useUserMainRole } from "@/lib/queries/auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  fallback?: React.ReactNode;
}

export function ProtectedRoute({ children, requiredRoles, fallback }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();

  // Ne charger les rôles que si l'utilisateur est authentifié
  const { data: userMainRole, isLoading: roleLoading } = useUserMainRole(
    isAuthenticated && user?.id ? user.id : undefined,
  );

  // Timeout de sécurité de 30 secondes (seulement en cas de problème)
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.error("Auth loading timeout - forcing redirect to login");
        router.push("/auth/v1/login");
      }
    }, 30000);

    return () => clearTimeout(timeout);
  }, [isLoading, router]);

  useEffect(() => {
    console.log("ProtectedRoute Debug:", {
      isAuthenticated,
      isLoading,
      roleLoading,
      userMainRole,
      requiredRoles,
      user: user?.email,
    });

    // Ne rien faire si l'authentification est encore en cours de chargement
    if (isLoading) {
      console.log("Authentication still loading...");
      return;
    }

    // Si l'authentification est terminée et que l'utilisateur n'est pas connecté
    if (!isAuthenticated) {
      console.log("Not authenticated, redirecting to login");
      router.push("/auth/v1/login");
      return;
    }

    // Si l'utilisateur est authentifié mais que les rôles ne sont pas encore chargés, attendre
    if (roleLoading) {
      console.log("Waiting for roles to load...");
      return;
    }

    // Vérifier les rôles seulement si l'utilisateur est authentifié et les rôles sont chargés
    if (isAuthenticated && !roleLoading && requiredRoles && requiredRoles.length > 0) {
      // Si userMainRole est null, cela signifie que l'utilisateur n'a pas de rôle
      if (!userMainRole) {
        console.log("No role found for user, redirecting to unauthorized");
        router.push("/unauthorized");
        return;
      }

      const hasRequiredRole = requiredRoles.includes(userMainRole.role);
      console.log("Role check:", { hasRequiredRole, userMainRole, requiredRoles });

      if (!hasRequiredRole) {
        console.log("No required role, redirecting to unauthorized");
        router.push("/unauthorized");
        return;
      }
    }

    // Si on arrive ici, l'utilisateur est authentifié et autorisé
    console.log("User is authenticated and authorized");
  }, [isAuthenticated, isLoading, roleLoading, userMainRole, requiredRoles, router]);

  // Afficher un loader pendant le chargement de l'authentification
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2"></div>
      </div>
    );
  }

  // Afficher un loader pendant le chargement des rôles si l'utilisateur est authentifié
  if (isAuthenticated && roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2"></div>
      </div>
    );
  }

  // Si l'utilisateur n'est pas authentifié, ne pas afficher le contenu
  if (!isAuthenticated) {
    return null;
  }

  // Afficher le fallback si fourni
  if (fallback) {
    return <>{fallback}</>;
  }

  // Afficher les enfants si authentifié et autorisé
  return <>{children}</>;
}
