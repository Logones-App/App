"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function HomePage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Vérifier l'authentification au chargement
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth/roles");
      if (response.ok) {
        const roleData = await response.json();
        setIsAuthenticated(!!roleData.role);
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("Erreur lors de la vérification de l'authentification:", error);
      setIsAuthenticated(false);
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);

      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        setIsAuthenticated(false);
        router.refresh(); // Rafraîchir la page pour mettre à jour l'état
      } else {
        console.error("Erreur lors de la déconnexion");
      }
    } catch (error) {
      console.error("Erreur de déconnexion:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Afficher un état de chargement pendant la vérification
  if (isAuthenticated === null) {
    return (
      <div className="bg-background flex min-h-screen flex-col items-center justify-center">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="text-center">Vérification...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Bienvenue sur Studio Admin</h1>
          <p className="text-muted-foreground text-sm">Plateforme de gestion pour restaurants</p>
        </div>

        <div className="flex flex-col space-y-4">
          {isAuthenticated ? (
            // Utilisateur connecté - bouton de déconnexion direct
            <Button variant="destructive" className="w-full" onClick={handleLogout} disabled={isLoggingOut}>
              {isLoggingOut ? "Déconnexion..." : "Se déconnecter"}
            </Button>
          ) : (
            // Utilisateur non connecté - afficher les boutons de connexion
            <>
              <Link href="/auth/login">
                <Button className="w-full">Se connecter</Button>
              </Link>

              <Link href="/auth/register">
                <Button variant="outline" className="w-full">
                  Créer un compte
                </Button>
              </Link>
            </>
          )}
        </div>

        <div className="text-muted-foreground px-8 text-center text-sm">
          <p>Test de l'authentification avec Supabase SSR</p>
        </div>
      </div>
    </div>
  );
}
